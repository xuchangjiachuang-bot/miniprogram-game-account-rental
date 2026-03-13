import { NextRequest, NextResponse } from 'next/server';
import { wechatLogin, getWechatOpenUserInfo, WechatUserInfo } from '@/lib/wechat-oauth';
import { wechatLogin as wechatUserLogin } from '@/lib/user-service';
import { db } from '@/lib/db';
import { systemConfig } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

function isWechatQrLoginState(state: string | null) {
  return typeof state === 'string' && /^login_\d+_[a-z0-9]+$/i.test(state);
}

function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth_token', token, {
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

function getSafeReturnTo(request: NextRequest) {
  const returnTo = request.cookies.get('wechat_auth_return_to')?.value || '';
  return returnTo.startsWith('/') ? returnTo : '';
}

function clearWechatReturnToCookie(response: NextResponse) {
  response.cookies.set('wechat_auth_return_to', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

/**
 * 微信OAuth回调 - 处理微信授权回调
 * GET /api/auth/wechat/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  const returnTo = getSafeReturnTo(request);
  // 获取正确的基础URL（用于重定向）- 必须在函数开头定义
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top';

  // 检测是否来自移动端（User-Agent检测）
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

  console.log('[微信回调] ============ 收到回调请求 ============');
  console.log('[微信回调] User-Agent:', userAgent);
  console.log('[微信回调] 是否移动端:', isMobile);

  // 如果是移动端且没有code参数，说明是误扫描了PC二维码
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('[微信回调] code:', code ? code.substring(0, 20) + '...' : 'null');
  console.log('[微信回调] state:', state);
  console.log('[微信回调] 完整URL:', request.url);
  console.log('[微信回调] 基础URL:', baseUrl);

  // 移动端误扫描PC二维码：显示提示页面
  if (isMobile && !code) {
    console.log('[微信回调] 检测到移动端访问且无code参数，显示提示页面');
    return new NextResponse(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>扫码登录</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      max-width: 400px;
      padding: 40px 30px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 28px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .steps {
      text-align: left;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin: 24px 0;
    }
    .step {
      margin: 12px 0;
      padding-left: 24px;
      position: relative;
      color: #555;
    }
    .step::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #4CAF50;
      font-weight: bold;
    }
    .note {
      font-size: 14px;
      color: #999;
      margin-top: 20px;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📱</div>
    <h1>请在电脑上扫码登录</h1>
    <p>此二维码用于电脑端扫码登录，手机端无法直接登录。</p>
    <div class="steps">
      <div class="step">在电脑浏览器中打开登录页面</div>
      <div class="step">使用手机微信扫描电脑上显示的二维码</div>
      <div class="step">在手机微信中点击"确认登录"</div>
    </div>
    <p class="note">如果您已经在电脑上扫码，请关闭此页面，电脑端会自动登录。</p>
  </div>
</body>
</html>
    `, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  try {
    // 验证必要参数
    if (!code) {
      console.error('[微信回调] ❌ 缺少code参数');
      return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
    }

    // 判断是公众号登录还是开放平台扫码登录
    const isQrLogin = isWechatQrLoginState(state);
    console.log('[微信回调] 登录类型:', isQrLogin ? '开放平台扫码登录' : '公众号OAuth登录');

    let wechatUser: WechatUserInfo;
    if (isQrLogin) {
      // 开放平台扫码登录
      console.log('[微信回调] 🔄 开始获取开放平台用户信息...');
      const openResult = await getWechatOpenUserInfo(code);
      
      console.log('[微信回调] 开放平台结果:', {
        success: openResult.success,
        message: openResult.message,
        hasUserInfo: !!openResult.userInfo
      });

      if (!openResult.success || !openResult.userInfo) {
        console.error('[微信回调] ❌ 获取微信用户信息失败:', openResult.message);
        return NextResponse.redirect(new URL('/login?error=wechat_auth_failed&reason=' + encodeURIComponent(openResult.message || '未知错误'), baseUrl));
      }
      wechatUser = openResult.userInfo;
    } else {
      // 公众号OAuth登录
      console.log('[微信回调] 🔄 开始获取公众号用户信息...');
      const wechatResult = await wechatLogin(code);

      console.log('[微信回调] 公众号结果:', {
        success: wechatResult.success,
        message: wechatResult.message,
        hasUserInfo: !!wechatResult.userInfo
      });

      if (!wechatResult.success || !wechatResult.userInfo) {
        console.error('[微信回调] ❌ 获取微信用户信息失败:', wechatResult.message);
        return NextResponse.redirect(new URL('/login?error=wechat_auth_failed&reason=' + encodeURIComponent(wechatResult.message || '未知错误'), baseUrl));
      }
      wechatUser = wechatResult.userInfo;
    }

    if (!wechatUser) {
      console.error('[微信回调] ❌ 获取微信用户失败');
      return NextResponse.redirect(new URL('/login?error=wechat_auth_failed', baseUrl));
    }

    console.log('[微信回调] ✅ 获取微信用户成功:', {
      openid: wechatUser.openid,
      nickname: wechatUser.nickname,
      hasAvatar: !!wechatUser.headimgurl
    });

    // 使用专门的微信登录函数
    try {
      console.log('[微信回调] 开始调用 wechatUserLogin...');

      const loginResult = await wechatUserLogin({
        openid: wechatUser.openid,
        nickname: wechatUser.nickname,
        avatar: wechatUser.headimgurl,
        unionid: wechatUser.unionid,
        source: isQrLogin ? 'open' : 'mp',
      });

      console.log('[微信回调] 微信登录结果:', {
        success: loginResult.success,
        message: loginResult.message,
        hasToken: !!loginResult.token,
        hasUser: !!loginResult.user,
        userId: loginResult.user?.id
      });

      if (loginResult.success && loginResult.token) {
        // 判断是否是扫码登录
        if (isQrLogin && state) {
          // 扫码登录：先保存登录状态到数据库，然后通过 postMessage 通知父页面
          console.log('[微信回调] 扫码登录成功，保存登录状态');

          // 保存登录状态到数据库
          const key = `wechat_login_${state}`;
          const value = JSON.stringify({
            token: loginResult.token,
            loggedIn: true,
            createdAt: Date.now()
          });

          try {
            const existing = await db
              .select()
              .from(systemConfig)
              .where(eq(systemConfig.configKey, key))
              .limit(1);

            if (existing.length > 0) {
              await db
                .update(systemConfig)
                .set({
                  configValue: value,
                  updatedAt: new Date().toISOString()
                })
                .where(eq(systemConfig.configKey, key));
            } else {
              await db.insert(systemConfig).values({
                configKey: key,
                configValue: value,
                description: '微信扫码登录临时状态'
              });
            }
            console.log('[微信回调] 登录状态已保存到数据库');
          } catch (error) {
            console.error('[微信回调] 保存登录状态失败:', error);
          }

          // 返回一个 HTML 页面，通过 postMessage 通知父页面
          console.log('[微信回调] 通知父页面');
          return attachAuthCookie(new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录成功</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      color: #333;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>登录成功</h1>
    <p>正在关闭窗口，请稍候...</p>
  </div>
  <script>
    (function() {
      var token = '${loginResult.token}';
      var user = JSON.parse('${JSON.stringify(loginResult.user)}');
      
      // 通过 postMessage 通知父页面登录成功
      var message = {
        type: 'wechat_login_success',
        token: token,
        user: user
      };
      
      // 尝试通知父窗口
      try {
        if (window.opener) {
          // 如果是从新窗口打开的
          window.opener.postMessage(message, '*');
          window.close();
        } else if (window.parent !== window.self) {
          // 如果是在 iframe 中
          window.parent.postMessage(message, '*');
        } else {
          // 直接在当前窗口（降级处理）
          console.log('无法找到父窗口，降级处理');
          window.location.href = '/?wechat_login=success&token=' + encodeURIComponent(token);
        }
      } catch (error) {
        console.error('postMessage 失败:', error);
        // 降级处理：跳转到首页
        window.location.href = '/?wechat_login=success&token=' + encodeURIComponent(token);
      }
    })();
  </script>
</body>
</html>
          `, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          }), loginResult.token);
        } else {
          // 普通登录：跳转到首页
          const redirectUrl = new URL(returnTo || '/?login_success=true', baseUrl);
          redirectUrl.searchParams.set('token', loginResult.token);

          console.log('[微信回调] 微信登录成功，跳转到首页:', redirectUrl.toString());
          console.log('[微信回调] Token长度:', loginResult.token.length);
          return clearWechatReturnToCookie(
            attachAuthCookie(NextResponse.redirect(redirectUrl), loginResult.token)
          );
        }
      } else {
        console.error('[微信回调] ❌ 微信登录失败:', loginResult.message);
        console.error('[微信回调] 登录结果详情:', loginResult);
        const errorUrl = new URL('/login?error=wechat_login_failed&reason=' + encodeURIComponent(loginResult.message || '未知错误'), baseUrl);
        console.error('[微信回调] 跳转到错误页面:', errorUrl.toString());
        return NextResponse.redirect(errorUrl);
      }
    } catch (error: any) {
      console.error('[微信回调] ❌ 微信登录异常:', error);
      console.error('[微信回调] 错误堆栈:', error.stack);
      return NextResponse.redirect(new URL('/login?error=internal_error', baseUrl));
    }

  } catch (error: any) {
    console.error('[微信回调] 异常:', error);
    return NextResponse.redirect(new URL('/login?error=internal_error', baseUrl));
  }
}
