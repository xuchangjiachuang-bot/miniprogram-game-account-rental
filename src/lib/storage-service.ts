import { existsSync } from 'fs';
import {
  mkdir,
  readdir,
  readFile as readLocalFile,
  unlink,
  writeFile,
} from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Storage } from 'coze-coding-dev-sdk';

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  folder?: string;
  expireTime?: number;
}

const LOCAL_PUBLIC_ROOT = path.join(process.cwd(), 'public');
const LOCAL_UPLOAD_PREFIX = 'uploads';

let remoteStorage: S3Storage | null | undefined;

type StoredFileReferenceKind =
  | 'empty'
  | 'data-url'
  | 'external-url'
  | 'browser-path'
  | 'storage-key';

function hasRemoteStorageConfig(): boolean {
  return Boolean(process.env.COZE_BUCKET_ENDPOINT_URL && process.env.COZE_BUCKET_NAME);
}

function allowLocalStorageFallback(): boolean {
  if (process.env.ALLOW_LOCAL_STORAGE_UPLOADS === 'true') {
    return true;
  }

  if (process.env.ALLOW_LOCAL_STORAGE_UPLOADS === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function getRemoteStorage(): S3Storage | null {
  if (!hasRemoteStorageConfig()) {
    return null;
  }

  if (!remoteStorage) {
    remoteStorage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  return remoteStorage;
}

function normalizeFolder(folder: string): string {
  const normalized = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return normalized || 'general';
}

function validateFileType(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(fileType);
}

function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

function generateFileName(originalName: string, folder: string): string {
  const safeFolder = normalizeFolder(folder);
  const ext = path.extname(originalName) || '.bin';
  return `${LOCAL_UPLOAD_PREFIX}/${safeFolder}/${Date.now()}_${randomUUID()}${ext.toLowerCase()}`;
}

function getLocalFilePath(fileKey: string): string {
  const normalized = fileKey.replace(/^\/+/, '').replace(/\.\./g, '');
  return path.join(LOCAL_PUBLIC_ROOT, normalized);
}

function normalizeStoredFileKey(fileKey: string): string {
  return fileKey
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');
}

function classifyStoredFileReference(reference: string | null | undefined): {
  kind: StoredFileReferenceKind;
  original: string;
  normalized: string;
} {
  const original = (reference || '').trim();
  if (!original) {
    return { kind: 'empty', original: '', normalized: '' };
  }

  if (original.startsWith('data:')) {
    return { kind: 'data-url', original, normalized: original };
  }

  if (original.startsWith('http://') || original.startsWith('https://')) {
    try {
      const parsed = new URL(original);
      const normalizedPath = normalizeStoredFileKey(parsed.pathname);
      if (normalizedPath.startsWith(`${LOCAL_UPLOAD_PREFIX}/`)) {
        return { kind: 'storage-key', original, normalized: normalizedPath };
      }

       const bucketName = process.env.COZE_BUCKET_NAME?.trim();
       if (bucketName) {
         const bucketPrefix = `${bucketName}/${LOCAL_UPLOAD_PREFIX}/`;
         if (normalizedPath.startsWith(bucketPrefix)) {
           return {
             kind: 'storage-key',
             original,
             normalized: normalizedPath.slice(bucketName.length + 1),
           };
         }
       }

       const uploadsIndex = normalizedPath.indexOf(`${LOCAL_UPLOAD_PREFIX}/`);
       if (uploadsIndex >= 0) {
         return {
           kind: 'storage-key',
           original,
           normalized: normalizedPath.slice(uploadsIndex),
         };
       }

      return { kind: 'external-url', original, normalized: original };
    } catch {
      return { kind: 'external-url', original, normalized: original };
    }
  }

  if (original.startsWith('/api/storage/file')) {
    try {
      const parsed = new URL(original, 'http://localhost');
      const key = parsed.searchParams.get('key');
      if (key) {
        return {
          kind: 'storage-key',
          original,
          normalized: normalizeStoredFileKey(key),
        };
      }
    } catch {
      return { kind: 'browser-path', original, normalized: original };
    }
  }

  const normalized = normalizeStoredFileKey(original);
  if (normalized.startsWith(`${LOCAL_UPLOAD_PREFIX}/`)) {
    return { kind: 'storage-key', original, normalized };
  }

  if (original.startsWith('/')) {
    return { kind: 'browser-path', original, normalized: original };
  }

  return { kind: 'storage-key', original, normalized };
}

function toPublicUrl(fileKey: string): string {
  const normalized = fileKey.replace(/\\/g, '/').replace(/^\/+/, '');
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  return origin ? `${origin}/${normalized}` : `/${normalized}`;
}

function normalizeBrowserUrl(reference: string): string {
  if (!reference.startsWith('http://')) {
    return reference;
  }

  try {
    const parsed = new URL(reference);
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return reference;
    }

    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return reference;
  }
}

function inferContentType(fileKey: string): string {
  const extension = path.extname(fileKey).toLowerCase();

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function buildAppFileUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey });
  return `/api/storage/file?${params.toString()}`;
}

async function saveFileLocally(
  fileContent: Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  const key = generateFileName(fileName, folder);
  const absolutePath = getLocalFilePath(key);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileContent);

  return {
    success: true,
    key,
    url: toPublicUrl(key),
  };
}

async function readStreamToBuffer(stream: AsyncIterable<Uint8Array>, maxSize: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of stream) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalSize += bufferChunk.length;
    if (totalSize > maxSize) {
      throw new Error(`文件大小超过限制，最大 ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
    }
    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks);
}

async function walkLocalFiles(directory: string, prefix = ''): Promise<string[]> {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkLocalFiles(fullPath, relativePath));
      continue;
    }

    files.push(relativePath.replace(/\\/g, '/'));
  }

  return files;
}

export async function uploadFile(
  fileContent: Buffer,
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      maxSize = 5 * 1024 * 1024,
      allowedTypes = [],
      folder = 'uploads',
      expireTime = 86400,
    } = options;

    if (!validateFileSize(fileContent.length, maxSize)) {
      return {
        success: false,
        error: `文件大小超过限制，最大 ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `文件类型不支持，允许的类型：${allowedTypes.join(', ')}`,
      };
    }

    const fileKey = generateFileName(fileName, folder);
    const storage = getRemoteStorage();
    if (!storage) {
      if (!allowLocalStorageFallback()) {
        return {
          success: false,
          error: 'PERSISTENT_STORAGE_NOT_CONFIGURED',
        };
      }

      return saveFileLocally(fileContent, fileName, folder);
    }

    const key = await storage.uploadFile({
      fileContent,
      fileName: fileKey,
      contentType,
    });

    return {
      success: true,
      key,
      url: buildAppFileUrl(key),
    };
  } catch (error: any) {
    console.error('上传文件失败:', error);
    return {
      success: false,
      error: error.message || '上传文件失败',
    };
  }
}

export async function uploadFileStream(
  stream: NodeJS.ReadableStream & AsyncIterable<Uint8Array>,
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = [],
    } = options;

    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `文件类型不支持，允许的类型：${allowedTypes.join(', ')}`,
      };
    }

    const storage = getRemoteStorage();
    if (!storage) {
      if (!allowLocalStorageFallback()) {
        return {
          success: false,
          error: 'PERSISTENT_STORAGE_NOT_CONFIGURED',
        };
      }

      const buffer = await readStreamToBuffer(stream, maxSize);
      return uploadFile(buffer, fileName, contentType, options);
    }

    const {
      folder = 'uploads',
      expireTime = 86400,
    } = options;

    const key = await storage.streamUploadFile({
      stream: stream as any,
      fileName: generateFileName(fileName, folder),
      contentType,
    });

    return {
      success: true,
      key,
      url: buildAppFileUrl(key),
    };
  } catch (error: any) {
    console.error('流式上传失败:', error);
    return {
      success: false,
      error: error.message || '流式上传失败',
    };
  }
}

export async function uploadFromUrl(
  url: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `下载文件失败: ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pathname = new URL(url).pathname;
    const fileName = path.basename(pathname) || 'remote-file';

    return uploadFile(buffer, fileName, response.headers.get('content-type') || 'application/octet-stream', options);
  } catch (error: any) {
    console.error('URL 转存失败:', error);
    return {
      success: false,
      error: error.message || 'URL 转存失败',
    };
  }
}

export async function readFile(fileKey: string): Promise<Buffer | null> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (normalizedReference.kind !== 'storage-key') {
      return null;
    }

    const storage = getRemoteStorage();
    if (!storage) {
      return await readLocalFile(getLocalFilePath(normalizedReference.normalized));
    }

    try {
      return await storage.readFile({ fileKey: normalizedReference.normalized });
    } catch (remoteError) {
      const localPath = getLocalFilePath(normalizedReference.normalized);
      if (existsSync(localPath)) {
        return await readLocalFile(localPath);
      }

      throw remoteError;
    }
  } catch (error) {
    console.error('读取文件失败:', error);
    return null;
  }
}

export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (normalizedReference.kind !== 'storage-key') {
      return false;
    }

    const storage = getRemoteStorage();
    if (!storage) {
      const localPath = getLocalFilePath(normalizedReference.normalized);
      if (!existsSync(localPath)) {
        return true;
      }
      await unlink(localPath);
      return true;
    }

    return await storage.deleteFile({ fileKey: normalizedReference.normalized });
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (normalizedReference.kind !== 'storage-key') {
      return false;
    }

    const storage = getRemoteStorage();
    if (!storage) {
      return existsSync(getLocalFilePath(normalizedReference.normalized));
    }

    const existsRemotely = await storage.fileExists({ fileKey: normalizedReference.normalized });
    if (existsRemotely) {
      return true;
    }

    return existsSync(getLocalFilePath(normalizedReference.normalized));
  } catch (error) {
    console.error('检查文件存在性失败:', error);
    return false;
  }
}

export async function generateFileUrl(
  fileKey: string,
  expireTime: number = 86400
): Promise<string | null> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (normalizedReference.kind === 'empty') {
      return null;
    }

    if (normalizedReference.kind === 'data-url') {
      return normalizedReference.normalized;
    }

    if (normalizedReference.kind === 'external-url' || normalizedReference.kind === 'browser-path') {
      return normalizeBrowserUrl(normalizedReference.normalized);
    }

    const storage = getRemoteStorage();
    if (!storage) {
      return (await fileExists(normalizedReference.normalized))
        ? toPublicUrl(normalizedReference.normalized)
        : null;
    }

    return buildAppFileUrl(normalizedReference.normalized);
  } catch (error) {
    console.error('生成文件 URL 失败:', error);
    return null;
  }
}

export async function resolveStoredFileReference(
  reference: string | null | undefined,
  expireTime: number = 86400
): Promise<string | null> {
  const classifiedReference = classifyStoredFileReference(reference);
  if (classifiedReference.kind === 'empty') {
    return null;
  }

  if (
    classifiedReference.kind === 'data-url' ||
    classifiedReference.kind === 'external-url' ||
    classifiedReference.kind === 'browser-path'
  ) {
    return normalizeBrowserUrl(classifiedReference.normalized);
  }

  if (hasRemoteStorageConfig()) {
    return generateFileUrl(classifiedReference.normalized, expireTime);
  }

  return buildAppFileUrl(classifiedReference.normalized);
}

export { classifyStoredFileReference, inferContentType, normalizeStoredFileKey };

export async function listFiles(
  prefix: string,
  maxKeys: number = 100
): Promise<{ keys: string[]; isTruncated: boolean }> {
  try {
    const storage = getRemoteStorage();
    if (!storage) {
      const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\\/g, '/');
      const baseDir = getLocalFilePath(normalizedPrefix);
      const keys = (await walkLocalFiles(baseDir, normalizedPrefix))
        .slice(0, maxKeys);

      return {
        keys,
        isTruncated: keys.length >= maxKeys,
      };
    }

    const result = await storage.listFiles({
      prefix,
      maxKeys,
    });

    return {
      keys: result.keys || [],
      isTruncated: result.isTruncated || false,
    };
  } catch (error) {
    console.error('列出文件失败:', error);
    return { keys: [], isTruncated: false };
  }
}
