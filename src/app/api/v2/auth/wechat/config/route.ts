import { NextRequest, NextResponse } from 'next/server';
import { getV2WechatConfig } from '@/lib/v2/wechat-login';

export async function GET(_request: NextRequest) {
  const pc = getV2WechatConfig('pc');
  const oauth = getV2WechatConfig('oauth');

  console.log('[v2-wechat-config] resolved', {
    pcValid: pc.valid,
    pcIssues: pc.issues,
    oauthValid: oauth.valid,
    oauthIssues: oauth.issues,
    callback: pc.config.redirectUri,
  });

  return NextResponse.json({
    success: true,
    data: {
      pc: {
        enabled: pc.valid,
        appId: pc.valid ? pc.config.appId : '',
        issues: pc.issues,
      },
      oauth: {
        enabled: oauth.valid,
        appId: oauth.valid ? oauth.config.appId : '',
        issues: oauth.issues,
      },
      callbackUri: pc.config.redirectUri,
      buildMarker: 'v2-login-bootstrap-001',
    },
  });
}
