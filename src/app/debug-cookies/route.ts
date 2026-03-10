import { NextRequest, NextResponse } from 'next/server';

/**
 * Cookie调试工具
 * GET /debug-cookies
 */
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookies[key] = value;
      }
    });
  }

  return NextResponse.json({
    message: 'Cookie调试信息',
    cookieHeader: cookieHeader || '无',
    cookies: cookies,
    hasAuthToken: !!cookies['auth_token'],
    authTokenValue: cookies['auth_token'] || '无'
  });
}
