import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { uploadFile } from '@/lib/storage-service';

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    const admin = adminList[0];
    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: '请选择要上传的文件',
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: '只支持上传图片文件',
        },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: '图片大小不能超过5MB',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadFile(buffer, file.name, file.type, {
      maxSize,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      folder: 'carousel',
      expireTime: 86400,
    });

    if (!result.success || !result.key || !result.url) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '上传失败，请稍后重试',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        fileKey: result.key,
        imageUrl: result.url,
        fileName: file.name,
      },
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '上传失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}
