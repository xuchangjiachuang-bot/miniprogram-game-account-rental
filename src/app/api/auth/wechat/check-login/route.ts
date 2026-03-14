import { NextRequest, NextResponse } from 'next/server';
import { clearLoginState, getLoginState } from '@/lib/wechat-login-store';

/**
 * 检查微信扫码登录状态
 * GET /api/auth/wechat/check-login?state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 state 参数',
        },
        { status: 400 }
      );
    }

    const loginState = await getLoginState(state);
    if (!loginState) {
      return NextResponse.json({
        success: true,
        loggedIn: false,
      });
    }

    if (loginState.loggedIn) {
      await clearLoginState(state);

      return NextResponse.json({
        success: true,
        loggedIn: true,
        token: loginState.token,
      });
    }

    return NextResponse.json({
      success: true,
      loggedIn: false,
    });
  } catch (error: any) {
    console.error('[wechat-check-login] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '检查登录状态失败',
      },
      { status: 500 }
    );
  }
}
