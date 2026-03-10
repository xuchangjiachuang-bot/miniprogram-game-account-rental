import { NextRequest, NextResponse } from 'next/server';
import { miniprogramLogin } from '@/lib/wechat-service';

// 禁用预渲染，确保API路由是动态的
export const dynamic = 'force-dynamic';

/**
 * 小程序登录
 * POST /api/auth/miniprogram/login
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({
        success: false,
        error: '缺少登录凭证'
      }, { status: 400 });
    }

    console.log('[小程序登录] 收到登录请求，code:', code);

    // 执行小程序登录
    const result = await miniprogramLogin(code);

    if (!result.success) {
      console.error('[小程序登录] 失败:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || '登录失败'
      }, { status: 400 });
    }

    console.log('[小程序登录] 成功，用户ID:', result.user?.id);

    // 返回用户信息和token
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error('[小程序登录] 异常:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '登录失败'
    }, { status: 500 });
  }
}
