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

function hasRemoteStorageConfig(): boolean {
  return Boolean(process.env.COZE_BUCKET_ENDPOINT_URL && process.env.COZE_BUCKET_NAME);
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
      return saveFileLocally(fileContent, fileName, folder);
    }

    const key = await storage.uploadFile({
      fileContent,
      fileName: fileKey,
      contentType,
    });

    const url = await storage.generatePresignedUrl({
      key,
      expireTime,
    });

    return {
      success: true,
      key,
      url,
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

    const url = await storage.generatePresignedUrl({
      key,
      expireTime,
    });

    return {
      success: true,
      key,
      url,
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
    const storage = getRemoteStorage();
    if (!storage) {
      return await readLocalFile(getLocalFilePath(fileKey));
    }

    return await storage.readFile({ fileKey });
  } catch (error) {
    console.error('读取文件失败:', error);
    return null;
  }
}

export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const storage = getRemoteStorage();
    if (!storage) {
      const localPath = getLocalFilePath(fileKey);
      if (!existsSync(localPath)) {
        return true;
      }
      await unlink(localPath);
      return true;
    }

    return await storage.deleteFile({ fileKey });
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const storage = getRemoteStorage();
    if (!storage) {
      return existsSync(getLocalFilePath(fileKey));
    }

    return await storage.fileExists({ fileKey });
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
    const storage = getRemoteStorage();
    if (!storage) {
      return (await fileExists(fileKey)) ? toPublicUrl(fileKey) : null;
    }

    return await storage.generatePresignedUrl({
      key: fileKey,
      expireTime,
    });
  } catch (error) {
    console.error('生成文件 URL 失败:', error);
    return null;
  }
}

export async function resolveStoredFileReference(
  reference: string | null | undefined,
  expireTime: number = 86400
): Promise<string | null> {
  if (!reference) {
    return null;
  }

  const normalizedReference = reference.trim();
  if (!normalizedReference) {
    return null;
  }

  if (
    normalizedReference.startsWith('http://') ||
    normalizedReference.startsWith('https://') ||
    normalizedReference.startsWith('/')
  ) {
    return normalizeBrowserUrl(normalizedReference);
  }

  if (hasRemoteStorageConfig()) {
    return generateFileUrl(normalizedReference, expireTime);
  }

  return buildAppFileUrl(normalizedReference);
}

export { inferContentType };

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
