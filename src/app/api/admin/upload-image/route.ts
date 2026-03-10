import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 上传图片接口
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
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
      return NextResponse.json({
        success: false,
        error: '请选择要上传的文件'
      }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: '只支持上传图片文件'
      }, { status: 400 });
    }

    // 验证文件大小（最大5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: '图片大小不能超过5MB'
      }, { status: 400 });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成文件名
    const fileName = `carousel/${Date.now()}_${file.name}`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: file.type,
    });

    // 生成签名URL（有效期1天）
    const imageUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400,
    });

    return NextResponse.json({
      success: true,
      data: {
        fileKey: fileKey,
        imageUrl: imageUrl,
        fileName: file.name
      }
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    return NextResponse.json({
      success: false,
      error: '上传失败，请稍后重试'
    }, { status: 500 });
  }
}
