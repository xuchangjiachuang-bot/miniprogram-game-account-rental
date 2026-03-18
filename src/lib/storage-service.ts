import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import {
  mkdir,
  readdir,
  readFile as readLocalFile,
  unlink,
  writeFile,
} from 'fs/promises';
import path from 'path';
import { fetchWechatJson } from './wechat-http';

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
    url?: string;
    hasAuthorization: boolean;
    hasToken: boolean;
    fileId?: string;
    cosFileId?: string;
  };
  upload?: {
    ok: boolean;
    status?: number;
    responseText?: string;
    metaFileIdUsed?: string;
  };
  download?: {
    ok: boolean;
    response?: WechatBatchDownloadResponse;
    url?: string;
    readbackMatches?: boolean;
    bytes?: number;
  };
  delete?: {
    attempted: boolean;
    ok: boolean;
    response?: WechatBatchDeleteResponse;
  };
  error?: string;
}

const LOCAL_PUBLIC_ROOT = path.join(process.cwd(), 'public');
const LOCAL_UPLOAD_PREFIX = 'uploads';
const WECHAT_API_BASE_URL = 'https://api.weixin.qq.com';
const WECHAT_OPEN_API_BASE_URL = 'http://api.weixin.qq.com';
const CLOUDBASE_ACCESS_TOKEN_FILE_PATH = '/.tencentcloudbase/wx/cloudbase_access_token';
const DEFAULT_PRODUCTION_CLOUDBASE_ENV_ID = 'hfb-0gv08jmpa261d9fc';

let cachedWechatAccessToken:
  | {
      value: string;
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

interface WechatUploadAuthResponse {
  errcode?: number;
  errmsg?: string;
  url?: string;
  token?: string;
  authorization?: string;
  file_id?: string;
  cos_file_id?: string;
}

interface WechatBatchDownloadResponse {
  errcode?: number;
  errmsg?: string;
  file_list?: Array<{
    fileid?: string;
    download_url?: string;
    status?: number;
    errcode?: number;
    errmsg?: string;
  }>;
}

interface WechatBatchDeleteResponse {
  errcode?: number;
  errmsg?: string;
  file_list?: Array<{
    fileid?: string;
    status?: number;
    errcode?: number;
    errmsg?: string;
  }>;
  delete_list?: Array<{
    fileid?: string;
    status?: number;
    errcode?: number;
    errmsg?: string;
  }>;
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

function getWechatMpAppId(): string {
  return getConfiguredEnvValue(['WECHAT_MP_APPID']);
}

function getWechatMpSecret(): string {
  return getConfiguredEnvValue(['WECHAT_MP_SECRET']);
}

function hasRemoteStorageConfig(): boolean {
  return Boolean(getCloudBaseEnvId());
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

function normalizeFolder(folder: string): string {
  const normalized = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return normalized || 'general';
}

function ensureUploadPrefix(folder: string): string {
  const normalized = normalizeFolder(folder);
  if (normalized === LOCAL_UPLOAD_PREFIX || normalized.startsWith(`${LOCAL_UPLOAD_PREFIX}/`)) {
    return normalized;
  }

  return `${LOCAL_UPLOAD_PREFIX}/${normalized}`;
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

function getLocalFilePath(fileKey: string): string {
  const normalized = fileKey.replace(/^\/+/, '').replace(/\.\./g, '');
  return path.join(LOCAL_PUBLIC_ROOT, normalized);
}

function normalizeStoredFileKey(fileKey: string): string {
  const trimmed = fileKey.trim();
  if (!trimmed) {
    return '';
  }

  if (isCloudStorageFileId(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');
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
        if (key) {
          return {
            kind: 'storage-key',
            original,
            normalized: normalizeStoredFileKey(key),
          };
        }
      }

      const normalizedPath = normalizeStoredFileKey(parsed.pathname);
      if (normalizedPath.startsWith(`${LOCAL_UPLOAD_PREFIX}/`)) {
        return { kind: 'storage-key', original, normalized: normalizedPath };
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
  if (normalized.startsWith(`${LOCAL_UPLOAD_PREFIX}/`) || isCloudStorageFileId(normalized)) {
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

function extractResponseErrorMessage(data: unknown, rawText: string): string {
  if (data && typeof data === 'object') {
    const candidate = data as { errcode?: number; errmsg?: string; message?: string };
    if (candidate.errmsg) {
      return candidate.errmsg;
    }

    if (candidate.message) {
      return candidate.message;
    }

    if (typeof candidate.errcode === 'number') {
      return `ERRCODE_${candidate.errcode}`;
    }
  }

  return rawText.slice(0, 200) || 'UNKNOWN_RESPONSE';
}

async function postWechatStorageJson<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  const openApiErrors: string[] = [];

  if (process.env.WECHAT_STORAGE_DISABLE_OPENAPI !== 'true') {
    try {
      return await postJsonRequest<T>(`${WECHAT_OPEN_API_BASE_URL}${endpoint}`, payload);
    } catch (error: unknown) {
      openApiErrors.push(getErrorMessage(error));
    }
  }

  const cloudbaseAccessToken = await getRuntimeCloudbaseAccessToken();
  if (cloudbaseAccessToken) {
    try {
      return await postJsonRequest<T>(
        `${WECHAT_API_BASE_URL}${endpoint}?cloudbase_access_token=${encodeURIComponent(cloudbaseAccessToken)}`,
        payload,
      );
    } catch (error: unknown) {
      openApiErrors.push(`cloudbase_token=${getErrorMessage(error)}`);
    }
  }

  let accessToken = '';
  try {
    accessToken = await getWechatStorageAccessToken();
  } catch (error: unknown) {
    if (openApiErrors.length > 0) {
      throw new Error(`${getErrorMessage(error)}; openapi=${openApiErrors.join(' | ')}`);
    }

    throw error;
  }

  try {
    return await postJsonRequest<T>(
      `${WECHAT_API_BASE_URL}${endpoint}?access_token=${encodeURIComponent(accessToken)}`,
      payload,
    );
  } catch (error: unknown) {
    const fallbackMessage = getErrorMessage(error);
    if (openApiErrors.length > 0) {
      throw new Error(`${fallbackMessage}; openapi=${openApiErrors.join(' | ')}`);
    }

    throw error;
  }
}

async function postJsonRequest<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
    throw new Error(`WECHAT_STORAGE_HTTP_${response.status}:${extractResponseErrorMessage(data, rawText)}`);
  }

  if (data && typeof data === 'object') {
    const candidate = data as { errcode?: number; errmsg?: string };
    if (typeof candidate.errcode === 'number' && candidate.errcode !== 0) {
      throw new Error(`WECHAT_STORAGE_API_${candidate.errcode}:${candidate.errmsg || 'UNKNOWN'}`);
    }
  }

  return data as T;
}

async function getWechatStorageAccessToken(): Promise<string> {
  if (cachedWechatAccessToken && cachedWechatAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedWechatAccessToken.value;
  }

  const appId = getWechatMpAppId();
  const secret = getWechatMpSecret();

  if (!appId || !secret) {
    throw new Error('WECHAT_MP_CREDENTIALS_MISSING');
  }

  const url = `${WECHAT_API_BASE_URL}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  const response = await fetchWechatJson<{
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  }>(url, { cache: 'no-store' });

  const data = response.data;
  if (!response.ok || !data.access_token) {
    throw new Error(
      `WECHAT_ACCESS_TOKEN_FAILED:${data.errmsg || data.errcode || response.status}`,
    );
  }

  cachedWechatAccessToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(300, Number(data.expires_in || 7200) - 300) * 1000,
  };

  return cachedWechatAccessToken.value;
}

async function getRuntimeCloudbaseAccessToken(): Promise<string> {
  if (!existsSync(CLOUDBASE_ACCESS_TOKEN_FILE_PATH)) {
    return '';
  }

  try {
    return (await readLocalFile(CLOUDBASE_ACCESS_TOKEN_FILE_PATH, 'utf8')).trim();
  } catch (error) {
    console.warn('[storage-service] Failed to read cloudbase access token file:', error);
    return '';
  }
}

function getRequiredEnvId(): string {
  const envId = getCloudBaseEnvId();
  if (!envId) {
    throw new Error('WECHAT_CLOUD_ENV_ID_MISSING');
  }

  return envId;
}

async function requestUploadAuthorization(fileKey: string): Promise<Required<Pick<WechatUploadAuthResponse, 'url' | 'authorization' | 'file_id'>> & Pick<WechatUploadAuthResponse, 'token' | 'cos_file_id'>> {
  const envId = getRequiredEnvId();
  const response = await postWechatStorageJson<WechatUploadAuthResponse>('/tcb/uploadfile', {
    env: envId,
    path: fileKey,
  });

  if (!response.url || !response.authorization || !response.file_id) {
    throw new Error('WECHAT_STORAGE_UPLOAD_AUTH_INVALID');
  }

  return {
    url: response.url,
    authorization: response.authorization,
    file_id: response.file_id,
    token: response.token,
    cos_file_id: response.cos_file_id,
  };
}

async function uploadFileToRemoteStorage(
  fileKey: string,
  fileContent: Buffer,
  contentType: string,
  originalName: string,
): Promise<{
  fileId: string;
  uploadStatus: number;
  uploadResponseText: string;
  metaFileIdUsed: string;
  auth: Required<Pick<WechatUploadAuthResponse, 'url' | 'authorization' | 'file_id'>> & Pick<WechatUploadAuthResponse, 'token' | 'cos_file_id'>;
}> {
  const auth = await requestUploadAuthorization(fileKey);
  const metaFileId = auth.cos_file_id || auth.file_id;
  const formData = new FormData();
  formData.append('key', fileKey);
  formData.append('Signature', auth.authorization);

  if (auth.token) {
    formData.append('x-cos-security-token', auth.token);
  }

  formData.append('x-cos-meta-fileid', metaFileId);
  formData.append(
    'file',
    new Blob([new Uint8Array(fileContent)], { type: contentType || inferContentType(fileKey) }),
    originalName || path.basename(fileKey) || 'file.bin',
  );

  const response = await fetch(auth.url, {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`WECHAT_STORAGE_UPLOAD_FAILED:${response.status}:${responseText.slice(0, 200)}`);
  }

  return {
    fileId: auth.file_id,
    uploadStatus: response.status,
    uploadResponseText: responseText,
    metaFileIdUsed: metaFileId,
    auth,
  };
}

async function getRemoteDownloadUrl(fileId: string, expireTime: number): Promise<string> {
  const envId = getRequiredEnvId();
  const response = await postWechatStorageJson<WechatBatchDownloadResponse>('/tcb/batchdownloadfile', {
    env: envId,
    file_list: [
      {
        fileid: fileId,
        max_age: expireTime,
      },
    ],
  });

  const result = response.file_list?.[0];
  if (!result) {
    throw new Error('WECHAT_STORAGE_DOWNLOAD_URL_MISSING');
  }

  const status = Number(result.status ?? result.errcode ?? 0);
  if (status !== 0 || !result.download_url) {
    throw new Error(`WECHAT_STORAGE_DOWNLOAD_URL_FAILED:${result.errmsg || status}`);
  }

  return result.download_url;
}

async function readRemoteFile(fileId: string): Promise<Buffer> {
  const downloadUrl = await getRemoteDownloadUrl(fileId, 600);
  const response = await fetch(downloadUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`WECHAT_STORAGE_DOWNLOAD_FAILED:${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function deleteRemoteFile(fileId: string): Promise<void> {
  const response = await deleteRemoteFileWithResponse(fileId);

  const result = response.file_list?.[0] || response.delete_list?.[0];
  if (!result) {
    return;
  }

  const status = Number(result.status ?? result.errcode ?? 0);
  if (status !== 0) {
    throw new Error(`WECHAT_STORAGE_DELETE_FAILED:${result.errmsg || status}`);
  }
}

async function deleteRemoteFileWithResponse(fileId: string): Promise<WechatBatchDeleteResponse> {
  const envId = getRequiredEnvId();
  return postWechatStorageJson<WechatBatchDeleteResponse>('/tcb/batchdeletefile', {
    env: envId,
    fileid_list: [fileId],
  });
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

    if (hasRemoteStorageConfig()) {
      const fileKey = generateFileName(fileName, folder);
      const uploadResult = await uploadFileToRemoteStorage(fileKey, fileContent, contentType, fileName);

      return {
        success: true,
        key: uploadResult.fileId,
        url: buildAppFileUrl(uploadResult.fileId),
      };
    }

    if (!allowLocalStorageFallback()) {
      return {
        success: false,
        error: 'PERSISTENT_STORAGE_NOT_CONFIGURED',
      };
    }

    return saveFileLocally(fileContent, fileName, folder);
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
    if (normalizedReference.kind !== 'storage-key') {
      return null;
    }

    if (isCloudStorageFileId(normalizedReference.normalized)) {
      if (!hasRemoteStorageConfig()) {
        return null;
      }

      return await readRemoteFile(normalizedReference.normalized);
    }

    const localPath = getLocalFilePath(normalizedReference.normalized);
    if (!existsSync(localPath)) {
      return null;
    }

    return await readLocalFile(localPath);
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

    if (isCloudStorageFileId(normalizedReference.normalized)) {
      if (!hasRemoteStorageConfig()) {
        return false;
      }

      await deleteRemoteFile(normalizedReference.normalized);
      return true;
    }

    const localPath = getLocalFilePath(normalizedReference.normalized);
    if (!existsSync(localPath)) {
      return true;
    }

    await unlink(localPath);
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

    if (isCloudStorageFileId(normalizedReference.normalized)) {
      if (!hasRemoteStorageConfig()) {
        return false;
      }

      try {
        await getRemoteDownloadUrl(normalizedReference.normalized, 60);
        return true;
      } catch {
        return false;
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

    if (isCloudStorageFileId(normalizedReference.normalized)) {
      if (!hasRemoteStorageConfig()) {
        return null;
      }

      void expireTime;
      return buildAppFileUrl(normalizedReference.normalized);
    }

    return (await fileExists(normalizedReference.normalized))
      ? toPublicUrl(normalizedReference.normalized)
      : null;
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
    const upload = await uploadFileToRemoteStorage(fileKey, fileContent, contentType, fileName);
    const downloadResponse = await postWechatStorageJson<WechatBatchDownloadResponse>('/tcb/batchdownloadfile', {
      env: getRequiredEnvId(),
      file_list: [
        {
          fileid: upload.fileId,
          max_age: options.expireTime || 600,
        },
      ],
    });

    const downloadItem = downloadResponse.file_list?.[0];
    const downloadOk = Boolean(downloadItem?.download_url) && Number(downloadItem?.status ?? 0) === 0;
    let readbackMatches = false;
    let bytes = 0;

    if (downloadOk && downloadItem?.download_url) {
      const response = await fetch(downloadItem.download_url, { cache: 'no-store' });
      const buffer = Buffer.from(await response.arrayBuffer());
      bytes = buffer.length;
      readbackMatches = response.ok && Buffer.compare(buffer, fileContent) === 0;
    }

    return {
      success: downloadOk && readbackMatches,
      storageEnabled: true,
      fileKey,
      fileId: upload.fileId,
      auth: {
        url: upload.auth.url,
        hasAuthorization: Boolean(upload.auth.authorization),
        hasToken: Boolean(upload.auth.token),
        fileId: upload.auth.file_id,
        cosFileId: upload.auth.cos_file_id,
      },
      upload: {
        ok: upload.uploadStatus >= 200 && upload.uploadStatus < 300,
        status: upload.uploadStatus,
        responseText: upload.uploadResponseText,
        metaFileIdUsed: upload.metaFileIdUsed,
      },
      download: {
        ok: downloadOk,
        response: downloadResponse,
        url: downloadItem?.download_url,
        readbackMatches,
        bytes,
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
    const response = await deleteRemoteFileWithResponse(fileId);
    const result = response.file_list?.[0] || response.delete_list?.[0];
    const status = Number(result?.status ?? result?.errcode ?? 0);

    return {
      attempted: true,
      ok: status === 0,
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
    const normalizedPrefix = normalizeStoredFileKey(prefix);

    if (hasRemoteStorageConfig()) {
      // Official WeChat CloudRun storage APIs cover upload/download/delete.
      // Listing is not used in the current runtime path, so we keep legacy local listing only.
      return { keys: [], isTruncated: false };
    }

    const baseDir = getLocalFilePath(normalizedPrefix);
    const keys = (await walkLocalFiles(baseDir, normalizedPrefix)).slice(0, maxKeys);

    return {
      keys,
      isTruncated: keys.length >= maxKeys,
    };
  } catch (error) {
    console.error('listFiles failed:', error);
    return { keys: [], isTruncated: false };
  }
}
