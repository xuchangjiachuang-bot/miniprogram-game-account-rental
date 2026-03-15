'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth-token';

interface ImageUploaderProps {
  type?: 'avatar' | 'id_card' | 'screenshot' | 'general';
  onSuccess: (url: string, key: string) => void;
  currentUrl?: string;
  onRemove?: () => void;
  maxSize?: number;
  accept?: string;
  inputId?: string;
  hideDefaultUi?: boolean;
}

export function ImageUploader({
  type = 'general',
  onSuccess,
  currentUrl,
  onRemove,
  maxSize,
  accept,
  inputId,
  hideDefaultUi = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const generatedInputId = useId();
  const resolvedInputId = inputId || `image-upload-${type}-${generatedInputId}`;

  useEffect(() => {
    setPreviewUrl(currentUrl);
  }, [currentUrl]);

  const defaultMaxSize = maxSize || (
    type === 'avatar' ? 2 :
    type === 'id_card' ? 5 :
    type === 'screenshot' ? 3 :
    5
  );

  const defaultAccept = accept || (
    type === 'avatar' ? 'image/jpeg,image/png,image/gif,image/webp' :
    type === 'id_card' ? 'image/jpeg,image/png,image/jpg' :
    type === 'screenshot' ? 'image/jpeg,image/png,image/webp' :
    'image/jpeg,image/png,image/gif,application/pdf'
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > defaultMaxSize * 1024 * 1024) {
      toast.error(`文件大小不能超过 ${defaultMaxSize}MB`);
      e.target.value = '';
      return;
    }

    const allowedTypes = defaultAccept.split(',');
    if (!allowedTypes.includes(file.type)) {
      toast.error(`仅支持以下文件类型：${allowedTypes.join(', ')}`);
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setPreviewUrl(result.url);
      onSuccess(result.url, result.key);
      toast.success('上传成功');
    } catch (error) {
      console.error('上传失败:', error);
      toast.error(error instanceof Error ? error.message : '上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onRemove?.();
  };

  return (
    <div className="space-y-2">
      <input
        id={resolvedInputId}
        type="file"
        accept={defaultAccept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!hideDefaultUi && (
        <>
          {previewUrl ? (
            <div className="relative w-full aspect-video overflow-hidden rounded-lg border border-gray-200">
              <img
                src={previewUrl}
                alt="预览"
                className="h-full w-full object-contain bg-gray-50"
              />
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor={resolvedInputId}>
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
              <p className="mt-1 text-xs text-gray-500">
                最大 {defaultMaxSize}MB，支持：{defaultAccept.split(',').join(', ')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
