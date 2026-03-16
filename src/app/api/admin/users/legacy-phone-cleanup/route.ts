import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  executeLegacyPhoneOnlyCleanup,
  previewLegacyPhoneOnlyCleanup,
} from '@/lib/legacy-phone-user-cleanup';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const preview = await previewLegacyPhoneOnlyCleanup();

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('[Admin Users] 预览旧手机号测试用户清理失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '预览清理失败',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const result = await executeLegacyPhoneOnlyCleanup();

    return NextResponse.json({
      success: true,
      message: result.deleted.users > 0 ? '旧手机号测试数据已清理' : '没有可清理的旧手机号测试数据',
      data: result,
    });
  } catch (error) {
    console.error('[Admin Users] 清理旧手机号测试用户失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '清理失败',
      },
      { status: 500 },
    );
  }
}
