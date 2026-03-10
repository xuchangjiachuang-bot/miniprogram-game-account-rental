import { NextRequest, NextResponse } from 'next/server';

/**
 * 管理员登出
 * DELETE /api/admin/auth/logout
 */
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    });

    // 清除管理员登录Cookie
    response.cookies.set('admin_token', '', {
      maxAge: 0,
      path: '/' // 与登录时保持一致
    });

    return response;
  } catch (error: any) {
    console.error('管理员登出失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '登出失败'
    }, { status: 500 });
  }
}
