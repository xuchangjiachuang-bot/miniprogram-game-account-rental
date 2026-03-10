'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth-token';

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
      // 获取 token
      const token = getToken();

      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // 上传到 Coze 存储
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
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
