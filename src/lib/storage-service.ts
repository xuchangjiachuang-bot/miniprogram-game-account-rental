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
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

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

let remoteStorage: S3Client | null | undefined;

type StoredFileReferenceKind =
  | 'empty'
  | 'data-url'
  | 'external-url'
  | 'browser-path'
  | 'storage-key';

function getConfiguredEnvValue(names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function getRemoteEndpointUrl(): string {
  return getConfiguredEnvValue([
    'COZE_BUCKET_ENDPOINT_URL',
    'STORAGE_ENDPOINT',
    'AWS_ENDPOINT_URL',
  ]);
}

function getRemoteBucketName(): string {
  return getConfiguredEnvValue([
    'COZE_BUCKET_NAME',
    'STORAGE_BUCKET_NAME',
    'AWS_BUCKET_NAME',
  ]);
}

function hasRemoteStorageConfig(): boolean {
  return Boolean(getRemoteEndpointUrl() && getRemoteBucketName());
}

function getRemoteRegion(): string {
  const configuredRegion = getConfiguredEnvValue([
    'COZE_BUCKET_REGION',
    'STORAGE_REGION',
    'AWS_REGION',
  ]);
  if (configuredRegion) {
    return configuredRegion;
  }

  const endpoint = getRemoteEndpointUrl();
  if (endpoint) {
    try {
      const { hostname } = new URL(endpoint);
      const cosMatch = hostname.match(/cos[.-]([a-z0-9-]+)\.myqcloud\.com$/i);
      if (cosMatch?.[1]) {
        return cosMatch[1];
      }

      const tosMatch = hostname.match(/tos[.-]([a-z0-9-]+)\./i);
      if (tosMatch?.[1]) {
        return tosMatch[1];
      }
    } catch {
      // ignore invalid endpoint and use the safe fallback below
    }
  }

  return 'ap-shanghai';
}

function getRemoteCredentials() {
  const accessKeyId = getConfiguredEnvValue([
    'COZE_BUCKET_ACCESS_KEY_ID',
    'STORAGE_ACCESS_KEY_ID',
    'AWS_ACCESS_KEY_ID',
  ]);
  const secretAccessKey = getConfiguredEnvValue([
    'COZE_BUCKET_SECRET_ACCESS_KEY',
    'STORAGE_SECRET_ACCESS_KEY',
    'AWS_SECRET_ACCESS_KEY',
  ]);
  const sessionToken = getConfiguredEnvValue([
    'COZE_BUCKET_SESSION_TOKEN',
    'STORAGE_SESSION_TOKEN',
    'AWS_SESSION_TOKEN',
  ]);

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined,
  };
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

function getRemoteStorage(): S3Client | null {
  if (!hasRemoteStorageConfig()) {
    return null;
  }

  if (!remoteStorage) {
    const credentials = getRemoteCredentials();
    remoteStorage = new S3Client({
      endpoint: getRemoteEndpointUrl(),
      region: getRemoteRegion(),
      forcePathStyle: true,
      credentials,
    });
  }

  return remoteStorage;
}

function isRemoteNotFoundError(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate?.name === 'NotFound' ||
    candidate?.name === 'NoSuchKey' ||
    candidate?.Code === 'NotFound' ||
    candidate?.Code === 'NoSuchKey' ||
    candidate?.$metadata?.httpStatusCode === 404
  );
}

async function bufferFromRemoteBody(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (
    typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray
    === 'function'
  ) {
    const bytes = await (body as {
      transformToByteArray: () => Promise<Uint8Array>;
    }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error('UNSUPPORTED_REMOTE_BODY');
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

      const bucketName = getRemoteBucketName();
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

async function verifyRemoteObjectExists(storage: S3Client, fileKey: string): Promise<void> {
  await storage.send(new HeadObjectCommand({
    Bucket: getRemoteBucketName(),
    Key: fileKey,
  }));
}

async function uploadFileToRemoteStorage(
  storage: S3Client,
  fileKey: string,
  body: Buffer | NodeJS.ReadableStream,
  contentType: string,
): Promise<void> {
  if (Buffer.isBuffer(body)) {
    await storage.send(new PutObjectCommand({
      Bucket: getRemoteBucketName(),
      Key: fileKey,
      Body: body,
      ContentType: contentType,
    }));
  } else {
    const uploader = new Upload({
      client: storage,
      params: {
        Bucket: getRemoteBucketName(),
        Key: fileKey,
        Body: body as any,
        ContentType: contentType,
      },
    });
    await uploader.done();
  }

  await verifyRemoteObjectExists(storage, fileKey);
}

async function saveFileLocally(
  fileContent: Buffer,
  fileName: string,
  folder: string,
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

async function readStreamToBuffer(
  stream: AsyncIterable<Uint8Array>,
  maxSize: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of stream) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalSize += bufferChunk.length;
    if (totalSize > maxSize) {
      throw new Error(`FILE_TOO_LARGE:${(maxSize / 1024 / 1024).toFixed(2)}MB`);
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
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    const {
      maxSize = 5 * 1024 * 1024,
      allowedTypes = [],
      folder = 'uploads',
    } = options;

    if (!validateFileSize(fileContent.length, maxSize)) {
      return {
        success: false,
        error: `FILE_TOO_LARGE:${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `FILE_TYPE_NOT_ALLOWED:${allowedTypes.join(',')}`,
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

      return saveFileLocally(fileContent, fileName, folder);
    }

    const key = generateFileName(fileName, folder);
    await uploadFileToRemoteStorage(storage, key, fileContent, contentType);

    return {
      success: true,
      key,
      url: buildAppFileUrl(key),
    };
  } catch (error: any) {
    console.error('uploadFile failed:', error);
    return {
      success: false,
      error: error?.message || 'UPLOAD_FAILED',
    };
  }
}

export async function uploadFileStream(
  stream: NodeJS.ReadableStream & AsyncIterable<Uint8Array>,
  fileName: string,
  contentType: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = [],
      folder = 'uploads',
    } = options;

    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `FILE_TYPE_NOT_ALLOWED:${allowedTypes.join(',')}`,
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

    const key = generateFileName(fileName, folder);
    await uploadFileToRemoteStorage(storage, key, stream, contentType);

    return {
      success: true,
      key,
      url: buildAppFileUrl(key),
    };
  } catch (error: any) {
    console.error('uploadFileStream failed:', error);
    return {
      success: false,
      error: error?.message || 'STREAM_UPLOAD_FAILED',
    };
  }
}

export async function uploadFromUrl(
  url: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `FETCH_REMOTE_FILE_FAILED:${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pathname = new URL(url).pathname;
    const fileName = path.basename(pathname) || 'remote-file';

    return uploadFile(
      buffer,
      fileName,
      response.headers.get('content-type') || 'application/octet-stream',
      options,
    );
  } catch (error: any) {
    console.error('uploadFromUrl failed:', error);
    return {
      success: false,
      error: error?.message || 'UPLOAD_FROM_URL_FAILED',
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
      const response = await storage.send(new GetObjectCommand({
        Bucket: getRemoteBucketName(),
        Key: normalizedReference.normalized,
      }));
      return await bufferFromRemoteBody(response.Body);
    } catch (remoteError) {
      const localPath = getLocalFilePath(normalizedReference.normalized);
      if (existsSync(localPath)) {
        return await readLocalFile(localPath);
      }

      throw remoteError;
    }
  } catch (error) {
    console.error('readFile failed:', error);
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

    await storage.send(new DeleteObjectCommand({
      Bucket: getRemoteBucketName(),
      Key: normalizedReference.normalized,
    }));

    return true;
  } catch (error) {
    console.error('deleteFile failed:', error);
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

    try {
      await verifyRemoteObjectExists(storage, normalizedReference.normalized);
      return true;
    } catch (error) {
      if (!isRemoteNotFoundError(error)) {
        throw error;
      }
    }

    return existsSync(getLocalFilePath(normalizedReference.normalized));
  } catch (error) {
    console.error('fileExists failed:', error);
    return false;
  }
}

export async function generateFileUrl(
  fileKey: string,
  expireTime: number = 86400,
): Promise<string | null> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (normalizedReference.kind === 'empty') {
      return null;
    }

    if (normalizedReference.kind === 'data-url') {
      return normalizedReference.normalized;
    }

    if (
      normalizedReference.kind === 'external-url'
      || normalizedReference.kind === 'browser-path'
    ) {
      return normalizeBrowserUrl(normalizedReference.normalized);
    }

    const storage = getRemoteStorage();
    if (!storage) {
      return (await fileExists(normalizedReference.normalized))
        ? toPublicUrl(normalizedReference.normalized)
        : null;
    }

    void expireTime;
    return buildAppFileUrl(normalizedReference.normalized);
  } catch (error) {
    console.error('generateFileUrl failed:', error);
    return null;
  }
}

export async function resolveStoredFileReference(
  reference: string | null | undefined,
  expireTime: number = 86400,
): Promise<string | null> {
  const classifiedReference = classifyStoredFileReference(reference);
  if (classifiedReference.kind === 'empty') {
    return null;
  }

  if (
    classifiedReference.kind === 'data-url'
    || classifiedReference.kind === 'external-url'
    || classifiedReference.kind === 'browser-path'
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
  maxKeys: number = 100,
): Promise<{ keys: string[]; isTruncated: boolean }> {
  try {
    const storage = getRemoteStorage();
    if (!storage) {
      const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\\/g, '/');
      const baseDir = getLocalFilePath(normalizedPrefix);
      const keys = (await walkLocalFiles(baseDir, normalizedPrefix)).slice(0, maxKeys);

      return {
        keys,
        isTruncated: keys.length >= maxKeys,
      };
    }

    const result = await storage.send(new ListObjectsV2Command({
      Bucket: getRemoteBucketName(),
      Prefix: normalizeStoredFileKey(prefix),
      MaxKeys: maxKeys,
    }));

    return {
      keys: (result.Contents || [])
        .map((item) => item.Key || '')
        .filter(Boolean),
      isTruncated: Boolean(result.IsTruncated),
    };
  } catch (error) {
    console.error('listFiles failed:', error);
    return { keys: [], isTruncated: false };
  }
}
