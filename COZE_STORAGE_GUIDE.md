# Coze 平台对象存储 - 文件上传功能最佳方案

## 概述

本文档详细说明了如何在 Coze 平台上实现对象存储功能，使用 Coze 内置的 S3 兼容对象存储服务。

---

## 核心优势

✅ **无需申请第三方服务** - Coze 平台内置对象存储
✅ **统一 S3 兼容接口** - 标准化 API，易于迁移
✅ **自动签名管理** - 无需手动处理签名
✅ **跨域适配** - 直接支持跨域访问
✅ **大文件支持** - 支持流式上传和分块上传

---

## 技术架构

```
用户上传文件
    ↓
前端：选择文件
    ↓
后端 API：验证并上传到 Coze 存储
    ↓
返回：文件 Key 和访问 URL
    ↓
前端：显示文件或下载
```

---

## 实施步骤

### Step 1: 安装依赖

```bash
pnpm add coze-coding-dev-sdk
```

### Step 2: 创建存储服务封装

创建 `src/lib/storage-service.ts`：

```typescript
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
  stream: NodeJS.ReadableStream,
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
      expireTime = 86400,
      timeout = 30000
    } = options;

    // 从 URL 下载并上传
    const key = await storage.uploadFromUrl({
      url,
      timeout,
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
```

### Step 3: 创建上传 API

创建 `src/app/api/storage/upload/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth-token';
import { uploadFile } from '@/lib/storage-service';

/**
 * 文件上传 API
 * POST /api/storage/upload
 *
 * 请求体：
 * - file: File 对象（multipart/form-data）
 * - type: 文件类型（avatar, id_card, screenshot）
 *
 * 返回：
 * - success: boolean
 * - key: string (文件 Key)
 * - url: string (访问 URL)
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = getToken();
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'general';

    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请选择文件'
      }, { status: 400 });
    }

    // 根据类型配置上传选项
    let uploadOptions = {};

    switch (type) {
      case 'avatar':
        uploadOptions = {
          maxSize: 2 * 1024 * 1024, // 2MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          folder: 'avatars',
          expireTime: 7 * 24 * 3600 // 7天
        };
        break;

      case 'id_card':
        uploadOptions = {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
          folder: 'id_cards',
          expireTime: 30 * 24 * 3600 // 30天
        };
        break;

      case 'screenshot':
        uploadOptions = {
          maxSize: 3 * 1024 * 1024, // 3MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          folder: 'screenshots',
          expireTime: 7 * 24 * 3600 // 7天
        };
        break;

      default:
        uploadOptions = {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
          folder: 'uploads',
          expireTime: 7 * 24 * 3600 // 7天
        };
    }

    // 转换文件为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传文件
    const result = await uploadFile(
      buffer,
      file.name,
      file.type,
      uploadOptions
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url
    });
  } catch (error: any) {
    console.error('上传文件失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '上传文件失败'
    }, { status: 500 });
  }
}
```

### Step 4: 创建前端上传组件

创建 `src/components/ImageUploader.tsx`：

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  type?: 'avatar' | 'id_card' | 'screenshot' | 'general';
  onSuccess: (url: string, key: string) => void;
  currentUrl?: string;
  onRemove?: () => void;
  maxSize?: number; // MB
  accept?: string;
}

export function ImageUploader({
  type = 'general',
  onSuccess,
  currentUrl,
  onRemove,
  maxSize,
  accept
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);

  // 默认文件大小限制
  const defaultMaxSize = maxSize || (
    type === 'avatar' ? 2 :
    type === 'id_card' ? 5 :
    type === 'screenshot' ? 3 :
    5
  );

  // 默认接受的文件类型
  const defaultAccept = accept || (
    type === 'avatar' ? 'image/jpeg,image/png,image/gif,image/webp' :
    type === 'id_card' ? 'image/jpeg,image/png,image/jpg' :
    type === 'screenshot' ? 'image/jpeg,image/png,image/webp' :
    'image/jpeg,image/png,image/gif,application/pdf'
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小
    if (file.size > defaultMaxSize * 1024 * 1024) {
      toast.error(`文件大小不能超过 ${defaultMaxSize}MB`);
      return;
    }

    // 验证文件类型
    const allowedTypes = defaultAccept.split(',');
    if (!allowedTypes.includes(file.type)) {
      toast.error(`仅支持以下文件类型：${allowedTypes.join(', ')}`);
      return;
    }

    setUploading(true);

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // 上传到 Coze 存储
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      toast.success('上传成功');
      setPreviewUrl(result.url);
      onSuccess(result.url, result.key);
    } catch (error) {
      console.error('上传失败:', error);
      toast.error(error instanceof Error ? error.message : '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onRemove?.();
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        // 显示预览
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
          <img
            src={previewUrl}
            alt="预览"
            className="w-full h-full object-contain bg-gray-50"
          />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        // 上传按钮
        <div>
          <input
            type="file"
            accept={defaultAccept}
            onChange={handleFileChange}
            className="hidden"
            id={`image-upload-${type}`}
          />
          <label htmlFor={`image-upload-${type}`}>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="w-full"
              asChild
            >
              <span className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    选择图片
                  </>
                )}
              </span>
            </Button>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            最大 {defaultMaxSize}MB，支持：{defaultAccept.split(',').join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Step 5: 集成到用户中心

在 `src/app/user-center/page.tsx` 中使用：

```typescript
import { ImageUploader } from '@/components/ImageUploader';

// 头像上传
const handleAvatarUpload = (url: string, key: string) => {
  setProfileForm({
    ...profileForm,
    avatar: url,
    avatarKey: key // 存储 key，用于后续重新生成 URL
  });
  toast.success('头像上传成功');
};

// 身份证照片上传
const handleIdCardUpload = (url: string, key: string, field: 'idCardFront' | 'idCardBack') => {
  setVerificationForm({
    ...verificationForm,
    [field]: url,
    [`${field}Key`]: key
  });
};

// JSX 中使用
<div className="space-y-2">
  <Label>头像</Label>
  <ImageUploader
    type="avatar"
    onSuccess={handleAvatarUpload}
    currentUrl={profileForm.avatar}
    onRemove={() => {
      setProfileForm({ ...profileForm, avatar: '' });
    }}
  />
</div>

<div className="space-y-2">
  <Label>身份证正面</Label>
  <ImageUploader
    type="id_card"
    onSuccess={(url, key) => handleIdCardUpload(url, key, 'idCardFront')}
    currentUrl={verificationForm.idCardFront}
    onRemove={() => {
      setVerificationForm({ ...verificationForm, idCardFront: '' });
    }}
  />
</div>
```

---

## 环境变量配置

在 `.env.local` 中添加（Coze 平台会自动提供）：

```bash
# Coze 对象存储配置（部署到 Coze 时自动提供）
COZE_BUCKET_ENDPOINT_URL=https://your-bucket-endpoint-url
COZE_BUCKET_NAME=your-bucket-name
```

**注意**：
- 部署到 Coze 平台时，这些环境变量会自动配置
- 本地开发时，如果没有这些变量，可以使用模拟实现或申请第三方 OSS 服务

---

## 最佳实践

### 1. 存储 Key，而非 URL

```typescript
// ✅ 推荐：存储 Key
const result = await uploadFile(...);
await db.user.update({ avatarKey: result.key });

// 使用时动态生成 URL
const user = await db.user.findById(userId);
const avatarUrl = await generateFileUrl(user.avatarKey);
```

### 2. 合理设置 URL 有效期

- 头像、截图：7天
- 身份证照片：30天
- 永久文件：365天

### 3. 文件分类存储

- `avatars/` - 用户头像
- `id_cards/` - 身份证照片
- `screenshots/` - 账号截图
- `uploads/` - 通用文件

### 4. 安全性考虑

- 验证用户身份（登录）
- 限制文件大小
- 限制文件类型
- 验证文件内容（可添加）

---

## 与传统 OSS 方案对比

| 特性 | Coze Storage | 传统 OSS |
|-----|-------------|---------|
| 配置复杂度 | 简单（自动配置） | 复杂（需申请） |
| 需要密钥 | 不需要 | 需要 |
| 跨域处理 | 自动支持 | 需手动配置 |
| 成本 | 包含在平台 | 按量计费 |
| 迁移性 | S3 兼容，易迁移 | 依赖供应商 |

---

## 故障排查

### 问题：上传失败

1. 检查文件大小是否超过限制
2. 检查文件类型是否允许
3. 查看控制台错误信息
4. 确认环境变量配置正确

### 问题：URL 无法访问

1. 检查 URL 是否过期
2. 确认使用 `generatePresignedUrl` 生成 URL
3. 不要自行拼接 URL

### 问题：文件显示异常

1. 检查 Content-Type 是否正确
2. 确认文件内容完整
3. 尝试重新生成 URL

---

## 总结

使用 Coze 平台的对象存储服务，可以快速、安全地实现文件上传功能，无需申请第三方服务，降低了开发成本和复杂度。

**核心优势**：
- ✅ 零配置，开箱即用
- ✅ 自动管理签名和跨域
- ✅ S3 兼容，易于迁移
- ✅ 支持大文件上传

**下一步**：
按照上述步骤实施，即可在 Coze 平台上实现完整的文件上传功能。
