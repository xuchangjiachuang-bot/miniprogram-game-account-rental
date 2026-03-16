import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getServerUserId } from '@/lib/server-auth';
import { uploadFile } from '@/lib/storage-service';

type UploadType = 'avatar' | 'id_card' | 'screenshot' | 'general';

function getUploadOptions(type: UploadType) {
  switch (type) {
    case 'avatar':
      return {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        folder: 'avatars',
        expireTime: 7 * 24 * 3600,
      };
    case 'id_card':
      return {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        folder: 'id_cards',
        expireTime: 30 * 24 * 3600,
      };
    case 'screenshot':
      return {
        maxSize: 3 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        folder: 'screenshots',
        expireTime: 7 * 24 * 3600,
      };
    default:
      return {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        folder: 'uploads',
        expireTime: 7 * 24 * 3600,
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      const adminAuth = await requireAdmin(request);
      if ('error' in adminAuth) {
        return adminAuth.error;
      }
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = ((formData.get('type') as string) || 'general') as UploadType;

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: '请选择文件' }, { status: 400 });
    }

    const options = getUploadOptions(type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, file.name, file.type, options);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || '上传失败' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
    });
  } catch (error: any) {
    console.error('上传文件失败:', error);
    return NextResponse.json({ success: false, error: error.message || '上传文件失败' }, { status: 500 });
  }
}
