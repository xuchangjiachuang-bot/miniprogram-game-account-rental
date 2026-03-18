function normalizeStoredKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('cloud://')) {
    return trimmed;
  }

  return trimmed.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\./g, '');
}

function extractManagedStorageKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('cloud://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/storage/file')) {
    try {
      const parsed = new URL(trimmed, 'http://localhost');
      const key = parsed.searchParams.get('key');
      return key ? normalizeStoredKey(key) : null;
    } catch {
      return null;
    }
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const normalized = normalizeStoredKey(trimmed);
    return normalized.startsWith('uploads/') ? normalized : null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.pathname.startsWith('/api/storage/file')) {
      const key = parsed.searchParams.get('key');
      return key ? normalizeStoredKey(key) : null;
    }

    const normalizedPath = normalizeStoredKey(parsed.pathname);
    if (normalizedPath.startsWith('uploads/')) {
      return normalizedPath;
    }

    const uploadsIndex = normalizedPath.indexOf('uploads/');
    if (uploadsIndex >= 0) {
      return normalizedPath.slice(uploadsIndex);
    }
  } catch {
    return null;
  }

  return null;
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

  const managedStorageKey = extractManagedStorageKey(trimmed);
  if (managedStorageKey) {
    const relativeUrl = `/api/storage/file?key=${encodeURIComponent(managedStorageKey)}`;
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${relativeUrl}` : relativeUrl;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${trimmed}` : trimmed;
  }

  const normalizedKey = normalizeStoredKey(trimmed);

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
