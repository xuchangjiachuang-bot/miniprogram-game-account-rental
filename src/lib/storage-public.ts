function normalizeStoredKey(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\./g, '');
}

export function resolvePublicFileReference(
  reference: string | null | undefined,
  options?: { origin?: string },
): string | null {
  if (!reference) {
    return null;
  }

  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/storage/file')) {
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${trimmed}` : trimmed;
  }

  if (trimmed.startsWith('/')) {
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${trimmed}` : trimmed;
  }

  const normalizedKey = normalizeStoredKey(trimmed);
  if (normalizedKey.startsWith('uploads/')) {
    const relativeUrl = `/api/storage/file?key=${encodeURIComponent(normalizedKey)}`;
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${relativeUrl}` : relativeUrl;
  }

  return options?.origin ? `${options.origin.replace(/\/+$/, '')}/${normalizedKey}` : `/${normalizedKey}`;
}

export function resolvePublicFileReferences(
  references: unknown,
  options?: { origin?: string },
): string[] {
  if (!Array.isArray(references)) {
    return [];
  }

  return references
    .filter((item): item is string => typeof item === 'string')
    .map((item) => resolvePublicFileReference(item, options))
    .filter((item): item is string => Boolean(item));
}
