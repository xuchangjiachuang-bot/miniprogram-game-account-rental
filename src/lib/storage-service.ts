/**
 * 对象存储服务
 * 使用 Coze 平台内置的 S3 兼容对象存储
 */

import { S3Storage } from "coze-coding-dev-sdk";

// ==================== 类型定义 ====================

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface UploadOptions {
  maxSize?: number; // 最大文件大小（字节），默认 5MB
  allowedTypes?: string[]; // 允许的文件类型，例如 ['image/jpeg', 'image/png']
  folder?: string; // 文件夹路径，默认 'uploads'
  expireTime?: number; // URL 有效期（秒），默认 86400（1天）
}

// ==================== 初始化存储客户端 ====================

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// ==================== 工具函数 ====================

/**
 * 验证文件类型
 */
function validateFileType(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(fileType);
}

/**
 * 验证文件大小
 */
function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

/**
 * 生成唯一文件名
 */
function generateFileName(originalName: string, folder: string): string {
  const ext = originalName.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${folder}/${timestamp}_${random}.${ext}`;
}

// ==================== 上传函数 ====================

/**
 * 上传文件（Buffer 方式）
 *
 * @param fileContent 文件内容（Buffer）
 * @param fileName 文件名
 * @param contentType 文件类型（MIME type）
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFile(
  fileContent: Buffer,
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = [],
      folder = 'uploads',
      expireTime = 86400 // 1天
    } = options;

    // 验证文件大小
    if (!validateFileSize(fileContent.length, maxSize)) {
      return {
        success: false,
        error: `文件大小超过限制（${(maxSize / 1024 / 1024).toFixed(2)}MB）`
      };
    }

    // 验证文件类型（如果指定了允许的类型）
    if (allowedTypes.length > 0 && !validateFileType(contentType, allowedTypes)) {
      return {
        success: false,
        error: `文件类型不支持，允许的类型：${allowedTypes.join(', ')}`
      };
    }

    // 生成文件名
    const safeFileName = generateFileName(fileName, folder);

    // 上传文件到 Coze 存储
    const key = await storage.uploadFile({
      fileContent,
      fileName: safeFileName,
      contentType,
    });

    // 生成签名 URL
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
      error: error.message || '上传文件失败'
    };
  }
}

/**
 * 上传文件（Stream 方式，适合大文件）
 *
 * @param stream 文件流
 * @param fileName 文件名
 * @param contentType 文件类型
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFileStream(
  stream: any,
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = [],
      folder = 'uploads',
      expireTime = 86400
    } = options;

    // 生成文件名
    const safeFileName = generateFileName(fileName, folder);

    // 流式上传
    const key = await storage.streamUploadFile({
      stream,
      fileName: safeFileName,
      contentType,
    });

    // 生成签名 URL
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
      error: error.message || '流式上传失败'
    };
  }
}

/**
 * 从 URL 上传文件（转存）
 *
 * @param url 文件 URL
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFromUrl(
  url: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      folder = 'uploads',
      expireTime = 86400
    } = options;

    // 从 URL 下载并上传
    const key = await storage.uploadFromUrl({
      url,
    });

    // 生成签名 URL
    const signedUrl = await storage.generatePresignedUrl({
      key,
      expireTime,
    });

    return {
      success: true,
      key,
      url: signedUrl,
    };
  } catch (error: any) {
    console.error('从 URL 上传失败:', error);
    return {
      success: false,
      error: error.message || '从 URL 上传失败'
    };
  }
}

// ==================== 读取/删除函数 ====================

/**
 * 读取文件
 */
export async function readFile(fileKey: string): Promise<Buffer | null> {
  try {
    const data = await storage.readFile({ fileKey });
    return data;
  } catch (error) {
    console.error('读取文件失败:', error);
    return null;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const result = await storage.deleteFile({ fileKey });
    return result;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const result = await storage.fileExists({ fileKey });
    return result;
  } catch (error) {
    console.error('检查文件存在性失败:', error);
    return false;
  }
}

/**
 * 重新生成访问 URL
 */
export async function generateFileUrl(
  fileKey: string,
  expireTime: number = 86400
): Promise<string | null> {
  try {
    const url = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime,
    });
    return url;
  } catch (error) {
    console.error('生成文件 URL 失败:', error);
    return null;
  }
}

/**
 * 列出文件夹中的文件
 */
export async function listFiles(
  prefix: string,
  maxKeys: number = 100
): Promise<{ keys: string[]; isTruncated: boolean }> {
  try {
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
