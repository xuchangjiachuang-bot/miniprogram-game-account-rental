import { randomUUID } from 'crypto';
import path from 'path';
import COS from 'cos-nodejs-sdk-v5';

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

export interface StorageDebugRoundTripResult {
  success: boolean;
  storageEnabled: boolean;
  fileKey?: string;
  fileId?: string;
  auth?: {
    hasTempCredentials: boolean;
    expiresAt?: number;
    bucket?: string;
    region?: string;
    metaFileId?: string;
  };
  upload?: {
    ok: boolean;
    status?: number;
    metaFileIdUsed?: string;
  };
  download?: {
    ok: boolean;
    url?: string;
    readbackMatches?: boolean;
    bytes?: number;
  };
  delete?: {
    attempted: boolean;
    ok: boolean;
    response?: unknown;
  };
  error?: string;
}

const STORAGE_OBJECT_PREFIX = 'uploads';
const WECHAT_OPEN_API_BASE_URL = 'http://api.weixin.qq.com';
const DEFAULT_PRODUCTION_CLOUDBASE_ENV_ID = 'hfb-0gv08jmpa261d9fc';
const DEFAULT_STORAGE_REGION = 'ap-shanghai';

let cachedCosAuth:
  | {
      value: WechatCosAuthResponse;
      expiresAt: number;
    }
  | null = null;

type StoredFileReferenceKind =
  | 'empty'
  | 'data-url'
  | 'external-url'
  | 'browser-path'
  | 'storage-key';

interface ClassifiedStoredFileReference {
  kind: StoredFileReferenceKind;
  original: string;
  normalized: string;
}

interface WechatCosAuthResponse {
  errcode?: number;
  errmsg?: string;
  TmpSecretId?: string;
  TmpSecretKey?: string;
  Token?: string;
  ExpiredTime?: number;
}

interface WechatMetaEncodeResponse {
  errcode?: number;
  errmsg?: string;
  respdata?: {
    x_cos_meta_field_strs?: string[];
  };
}

interface ParsedCloudFileId {
  envId: string;
  bucket: string;
  key: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getConfiguredEnvValue(names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function getCloudBaseEnvId(): string {
  const configured = getConfiguredEnvValue([
    'CLOUDBASE_ENV_ID',
    'CBR_ENV_ID',
    'TCB_ENV_ID',
    'TCB_ENV',
    'WX_CLOUD_ENV_ID',
    'WXCLOUD_ENV_ID',
  ]);

  if (configured) {
    return configured;
  }

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim();
  const isKnownProductionRuntime = process.env.NODE_ENV === 'production'
    || appUrl.includes('hfb.yugioh.top');

  return isKnownProductionRuntime ? DEFAULT_PRODUCTION_CLOUDBASE_ENV_ID : '';
}

function getStorageBucket(): string {
  return getConfiguredEnvValue([
    'WECHAT_COS_BUCKET',
    'WECHAT_STORAGE_BUCKET',
    'CLOUDBASE_STORAGE_BUCKET',
    'STORAGE_BUCKET_NAME',
    'COZE_BUCKET_NAME',
  ]);
}

function getStorageRegion(): string {
  return getConfiguredEnvValue([
    'WECHAT_COS_REGION',
    'WECHAT_STORAGE_REGION',
    'CLOUDBASE_STORAGE_REGION',
    'STORAGE_REGION',
  ]) || DEFAULT_STORAGE_REGION;
}

function hasRemoteStorageConfig(): boolean {
  return Boolean(getCloudBaseEnvId() && getStorageBucket() && getStorageRegion());
}

function getRequiredEnvId(): string {
  const envId = getCloudBaseEnvId();
  if (!envId) {
    throw new Error('WECHAT_CLOUD_ENV_ID_MISSING');
  }

  return envId;
}

function getRequiredBucket(): string {
  const bucket = getStorageBucket();
  if (!bucket) {
    throw new Error('WECHAT_COS_BUCKET_MISSING');
  }

  return bucket;
}

function getRequiredRegion(): string {
  const region = getStorageRegion();
  if (!region) {
    throw new Error('WECHAT_COS_REGION_MISSING');
  }

  return region;
}

function normalizeFolder(folder: string): string {
  const normalized = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return normalized || 'general';
}

function ensureUploadPrefix(folder: string): string {
  const normalized = normalizeFolder(folder);
  if (normalized === STORAGE_OBJECT_PREFIX || normalized.startsWith(`${STORAGE_OBJECT_PREFIX}/`)) {
    return normalized;
  }

  return `${STORAGE_OBJECT_PREFIX}/${normalized}`;
}

function validateFileType(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(fileType);
}

function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

function isCloudStorageFileId(value: string): boolean {
  return value.trim().startsWith('cloud://');
}

function generateFileName(originalName: string, folder: string): string {
  const targetFolder = ensureUploadPrefix(folder);
  const ext = path.extname(originalName) || '.bin';
  return `${targetFolder}/${Date.now()}_${randomUUID()}${ext.toLowerCase()}`;
}

function normalizeStoredFileKey(fileKey: string): string {
  const trimmed = fileKey.trim();
  if (!trimmed) {
    return '';
  }

  if (isCloudStorageFileId(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\./g, '');
}

function classifyStoredFileReference(reference: string | null | undefined): ClassifiedStoredFileReference {
  const original = (reference || '').trim();
  if (!original) {
    return { kind: 'empty', original: '', normalized: '' };
  }

  if (original.startsWith('data:')) {
    return { kind: 'data-url', original, normalized: original };
  }

  if (isCloudStorageFileId(original)) {
    return {
      kind: 'storage-key',
      original,
      normalized: normalizeStoredFileKey(original),
    };
  }

  if (original.startsWith('http://') || original.startsWith('https://')) {
    try {
      const parsed = new URL(original);

      if (parsed.pathname.startsWith('/api/storage/file')) {
        const key = parsed.searchParams.get('key');
        if (key && isCloudStorageFileId(key)) {
          return {
            kind: 'storage-key',
            original,
            normalized: normalizeStoredFileKey(key),
          };
        }
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
      if (key && isCloudStorageFileId(key)) {
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

  if (original.startsWith('/')) {
    return { kind: 'browser-path', original, normalized: original };
  }

  return {
    kind: 'browser-path',
    original,
    normalized: `/${normalizeStoredFileKey(original)}`,
  };
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
  const extension = path.extname(fileKey.split('?')[0]).toLowerCase();

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
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function buildAppFileUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey });
  return `/api/storage/file?${params.toString()}`;
}

function buildCloudFileId(envId: string, bucket: string, key: string): string {
  return `cloud://${envId}.${bucket}/${key.replace(/^\/+/, '')}`;
}

function parseCloudFileId(fileId: string): ParsedCloudFileId {
  const normalized = normalizeStoredFileKey(fileId);
  const match = normalized.match(/^cloud:\/\/([^/]+?)\.([^/]+?)\/(.+)$/);
  if (!match) {
    throw new Error('WECHAT_STORAGE_FILE_ID_INVALID');
  }

  return {
    envId: match[1],
    bucket: match[2],
    key: match[3].replace(/^\/+/, ''),
  };
}

async function requestWechatOpenApiJson<T>(
  endpoint: string,
  init?: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
  },
): Promise<T> {
  const response = await fetch(`${WECHAT_OPEN_API_BASE_URL}${endpoint}`, {
    method: init?.method || 'GET',
    headers: init?.body
      ? {
          'Content-Type': 'application/json',
        }
      : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const rawText = await response.text();
  let data: unknown = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (error: unknown) {
      throw new Error(`WECHAT_STORAGE_NON_JSON_RESPONSE:${getErrorMessage(error) || rawText.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error(`WECHAT_STORAGE_HTTP_${response.status}:${rawText.slice(0, 200)}`);
  }

  if (data && typeof data === 'object') {
    const candidate = data as { errcode?: number; errmsg?: string };
    if (typeof candidate.errcode === 'number' && candidate.errcode !== 0) {
      throw new Error(`WECHAT_STORAGE_OPEN_API_${candidate.errcode}:${candidate.errmsg || 'UNKNOWN'}`);
    }
  }

  return data as T;
}

async function getCosTemporaryAuth(): Promise<WechatCosAuthResponse> {
  if (cachedCosAuth && cachedCosAuth.expiresAt > Date.now() + 60_000) {
    return cachedCosAuth.value;
  }

  const auth = await requestWechatOpenApiJson<WechatCosAuthResponse>('/_/cos/getauth');

  if (!auth.TmpSecretId || !auth.TmpSecretKey || !auth.Token || !auth.ExpiredTime) {
    throw new Error('WECHAT_STORAGE_COS_AUTH_INVALID');
  }

  cachedCosAuth = {
    value: auth,
    expiresAt: Number(auth.ExpiredTime) * 1000,
  };

  return auth;
}

async function getCosClient(): Promise<COS> {
  const auth = await getCosTemporaryAuth();

  return new COS({
    SecretId: auth.TmpSecretId,
    SecretKey: auth.TmpSecretKey,
    SecurityToken: auth.Token,
    Protocol: 'https:',
  });
}

async function requestMetaFileId(bucket: string, key: string): Promise<string> {
  const response = await requestWechatOpenApiJson<WechatMetaEncodeResponse>('/_/cos/metaid/encode', {
    method: 'POST',
    body: {
      openid: '',
      bucket,
      paths: [`/${key.replace(/^\/+/, '')}`],
    },
  });

  const metaFileId = response.respdata?.x_cos_meta_field_strs?.[0];
  if (!metaFileId) {
    throw new Error('WECHAT_STORAGE_META_FILE_ID_MISSING');
  }

  return metaFileId;
}

async function uploadFileToRemoteStorage(
  fileKey: string,
  fileContent: Buffer,
  contentType: string,
): Promise<{
  fileId: string;
  statusCode?: number;
  metaFileId: string;
}> {
  const envId = getRequiredEnvId();
  const bucket = getRequiredBucket();
  const region = getRequiredRegion();
  const cos = await getCosClient();
  const metaFileId = await requestMetaFileId(bucket, fileKey);

  const response = await cos.putObject({
    Bucket: bucket,
    Region: region,
    Key: fileKey,
    StorageClass: 'STANDARD',
    Body: fileContent,
    ContentLength: fileContent.length,
    ContentType: contentType || inferContentType(fileKey),
    Headers: {
      'x-cos-meta-fileid': metaFileId,
    },
  });

  if (Number(response.statusCode || 0) !== 200) {
    throw new Error(`WECHAT_STORAGE_UPLOAD_FAILED:${response.statusCode || 'UNKNOWN'}`);
  }

  return {
    fileId: buildCloudFileId(envId, bucket, fileKey),
    statusCode: response.statusCode,
    metaFileId,
  };
}

async function readRemoteFile(fileId: string): Promise<Buffer> {
  const parsed = parseCloudFileId(fileId);
  const cos = await getCosClient();
  const response = await cos.getObject({
    Bucket: parsed.bucket,
    Region: getRequiredRegion(),
    Key: parsed.key,
  });

  return Buffer.isBuffer(response.Body) ? response.Body : Buffer.from(response.Body);
}

async function deleteRemoteFile(fileId: string): Promise<{ statusCode?: number }> {
  const parsed = parseCloudFileId(fileId);
  const cos = await getCosClient();
  const response = await cos.deleteObject({
    Bucket: parsed.bucket,
    Region: getRequiredRegion(),
    Key: parsed.key,
  });

  if (Number(response.statusCode || 0) !== 204 && Number(response.statusCode || 0) !== 200) {
    throw new Error(`WECHAT_STORAGE_DELETE_FAILED:${response.statusCode || 'UNKNOWN'}`);
  }

  return { statusCode: response.statusCode };
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

    if (!hasRemoteStorageConfig()) {
      return {
        success: false,
        error: 'WECHAT_STORAGE_COS_CONFIG_MISSING',
      };
    }

    const fileKey = generateFileName(fileName, folder);
    const uploadResult = await uploadFileToRemoteStorage(fileKey, fileContent, contentType);

    return {
      success: true,
      key: uploadResult.fileId,
      url: buildAppFileUrl(uploadResult.fileId),
    };
  } catch (error: unknown) {
    console.error('uploadFile failed:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'UPLOAD_FAILED',
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
    } = options;

    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `FILE_TYPE_NOT_ALLOWED:${allowedTypes.join(',')}`,
      };
    }

    const buffer = await readStreamToBuffer(stream, maxSize);
    return uploadFile(buffer, fileName, contentType, options);
  } catch (error: unknown) {
    console.error('uploadFileStream failed:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'STREAM_UPLOAD_FAILED',
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
  } catch (error: unknown) {
    console.error('uploadFromUrl failed:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'UPLOAD_FROM_URL_FAILED',
    };
  }
}

export async function readFile(fileKey: string): Promise<Buffer | null> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (
      normalizedReference.kind !== 'storage-key'
      || !isCloudStorageFileId(normalizedReference.normalized)
      || !hasRemoteStorageConfig()
    ) {
      return null;
    }

    return await readRemoteFile(normalizedReference.normalized);
  } catch (error) {
    console.error('readFile failed:', error);
    return null;
  }
}

export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (
      normalizedReference.kind !== 'storage-key'
      || !isCloudStorageFileId(normalizedReference.normalized)
      || !hasRemoteStorageConfig()
    ) {
      return false;
    }

    await deleteRemoteFile(normalizedReference.normalized);
    return true;
  } catch (error) {
    console.error('deleteFile failed:', error);
    return false;
  }
}

export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const normalizedReference = classifyStoredFileReference(fileKey);
    if (
      normalizedReference.kind !== 'storage-key'
      || !isCloudStorageFileId(normalizedReference.normalized)
      || !hasRemoteStorageConfig()
    ) {
      return false;
    }

    const parsed = parseCloudFileId(normalizedReference.normalized);
    const cos = await getCosClient();

    try {
      await cos.headObject({
        Bucket: parsed.bucket,
        Region: getRequiredRegion(),
        Key: parsed.key,
      });
      return true;
    } catch {
      return false;
    }
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

    if (!isCloudStorageFileId(normalizedReference.normalized) || !hasRemoteStorageConfig()) {
      return null;
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

  return generateFileUrl(classifiedReference.normalized, expireTime);
}

export async function debugRemoteStorageRoundTrip(
  fileContent: Buffer,
  fileName: string,
  contentType: string,
  options: UploadOptions = {},
): Promise<StorageDebugRoundTripResult> {
  if (!hasRemoteStorageConfig()) {
    return {
      success: false,
      storageEnabled: false,
      error: 'REMOTE_STORAGE_NOT_CONFIGURED',
    };
  }

  const folder = options.folder || 'diagnostics';
  const fileKey = generateFileName(fileName, folder);

  try {
    const envId = getRequiredEnvId();
    const bucket = getRequiredBucket();
    const region = getRequiredRegion();
    const auth = await getCosTemporaryAuth();
    const metaFileId = await requestMetaFileId(bucket, fileKey);
    const upload = await uploadFileToRemoteStorage(fileKey, fileContent, contentType);
    const cos = await getCosClient();
    const fileId = buildCloudFileId(envId, bucket, fileKey);
    const parsed = parseCloudFileId(fileId);
    const downloadUrl = cos.getObjectUrl({
      Bucket: parsed.bucket,
      Region: region,
      Key: parsed.key,
      Sign: true,
      Expires: options.expireTime || 600,
    });
    const buffer = await readRemoteFile(fileId);
    const readbackMatches = Buffer.compare(buffer, fileContent) === 0;

    return {
      success: readbackMatches,
      storageEnabled: true,
      fileKey,
      fileId,
      auth: {
        hasTempCredentials: true,
        expiresAt: auth.ExpiredTime,
        bucket,
        region,
        metaFileId,
      },
      upload: {
        ok: Number(upload.statusCode || 0) === 200,
        status: upload.statusCode,
        metaFileIdUsed: upload.metaFileId,
      },
      download: {
        ok: true,
        url: downloadUrl,
        readbackMatches,
        bytes: buffer.length,
      },
      delete: {
        attempted: false,
        ok: false,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      storageEnabled: true,
      fileKey,
      error: getErrorMessage(error),
    };
  }
}

export async function cleanupRemoteStorageFile(fileId: string): Promise<StorageDebugRoundTripResult['delete']> {
  try {
    const response = await deleteRemoteFile(fileId);

    return {
      attempted: true,
      ok: Number(response.statusCode || 0) === 204 || Number(response.statusCode || 0) === 200,
      response,
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      response: {
        errcode: -1,
        errmsg: getErrorMessage(error),
      },
    };
  }
}

export { classifyStoredFileReference, inferContentType, normalizeStoredFileKey };

export async function listFiles(
  prefix: string,
  maxKeys: number = 100,
): Promise<{ keys: string[]; isTruncated: boolean }> {
  try {
    if (!hasRemoteStorageConfig()) {
      return { keys: [], isTruncated: false };
    }

    const cos = await getCosClient();
    const result = await cos.getBucket({
      Bucket: getRequiredBucket(),
      Region: getRequiredRegion(),
      Prefix: normalizeStoredFileKey(prefix),
      'MaxKeys': maxKeys,
    });

    const contents = Array.isArray(result.Contents) ? result.Contents : [];
    const keys = contents
      .map((item) => String(item.Key || '').trim())
      .filter(Boolean)
      .slice(0, maxKeys);

    return {
      keys,
      isTruncated: String(result.IsTruncated || '').toLowerCase() === 'true',
    };
  } catch (error) {
    console.error('listFiles failed:', error);
    return { keys: [], isTruncated: false };
  }
}
