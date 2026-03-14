import { NextRequest, NextResponse } from 'next/server';
import {
  attachV2ReturnToCookie,
  buildV2WechatAuthorizeUrl,
  buildV2WechatState,
  isLocalRequest,
  normalizeV2ReturnTo,
  type V2WechatLoginKind,
} from '@/lib/v2/wechat-login';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = (searchParams.get('kind') === 'pc' ? 'pc' : 'oauth') as V2WechatLoginKind;
    const returnTo = normalizeV2ReturnTo(searchParams.get('returnTo'));

    if (isLocalRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'LOCAL_WECHAT_LOGIN_DISABLED',
          message: '本地开发环境不启用微信登录，请使用 HTTPS 公网域名访问。',
        },
        { status: 400 },
      );
    }

    const state = buildV2WechatState(kind, returnTo);
    const authorizeUrl = buildV2WechatAuthorizeUrl(kind, state);

    console.log('[v2-wechat-authorize] redirecting', {
      kind,
      returnTo,
    });

    return attachV2ReturnToCookie(NextResponse.redirect(authorizeUrl), returnTo);
  } catch (error: any) {
    console.error('[v2-wechat-authorize] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'V2_WECHAT_AUTHORIZE_FAILED',
      },
      { status: 500 },
    );
  }
}
