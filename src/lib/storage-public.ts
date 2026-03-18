function normalizeStoredKey(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\./g, '');
}

function extractManagedStorageKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const normalized = normalizeStoredKey(trimmed);
    return normalized.startsWith('uploads/') ? normalized : null;
  }

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = normalizeStoredKey(parsed.pathname);
    if (normalizedPath.startsWith('uploads/')) {
      return normalizedPath;
    }

    const bucketName = process.env.NEXT_PUBLIC_COZE_BUCKET_NAME?.trim();
    if (bucketName) {
      const bucketPrefix = `${bucketName}/uploads/`;
      if (normalizedPath.startsWith(bucketPrefix)) {
        return normalizedPath.slice(bucketName.length + 1);
      }
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

  if (trimmed.startsWith('/api/storage/file')) {
    return options?.origin ? `${options.origin.replace(/\/+$/, '')}${trimmed}` : trimmed;
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
