import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
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
    const userId = getServerUserId(request);
    if (!userId) {
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
