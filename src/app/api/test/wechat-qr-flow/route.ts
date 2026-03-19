import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * 测试微信二维码流程
 * GET /api/test/wechat-qr-flow
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  return new NextResponse(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>微信扫码登录流程说明</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 40px 20px;
      background: #f5f5f5;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    h1 { margin-bottom: 20px; color: #07c160; }
    h2 { margin-top: 30px; margin-bottom: 15px; color: #333; }
    .flow {
      display: flex;
      align-items: flex-start;
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .flow-number {
      font-size: 24px;
      font-weight: bold;
      color: #07c160;
      margin-right: 15px;
      min-width: 30px;
    }
    .flow-content { flex: 1; }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .solution {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 14px;
    }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 微信扫码登录流程分析</h1>

    <h2>当前实现方式（react-qr-code）</h2>
    <div class="flow">
      <div class="flow-number">1</div>
      <div class="flow-content">
        <strong>PC浏览器显示二维码</strong><br>
        使用 react-qr-code 生成二维码，内容为：<br>
        <code>https://open.weixin.qq.com/connect/qrconnect?appid=xxx&...</code>
      </div>
    </div>
    <div class="flow">
      <div class="flow-number">2</div>
      <div class="flow-content">
        <strong>手机微信扫码</strong><br>
        微信识别二维码内容后，跳转到浏览器打开链接
      </div>
    </div>
    <div class="flow">
      <div class="flow-number">3</div>
      <div class="flow-content">
        <strong>手机浏览器访问链接</strong><br>
        由于 qrconnect 是PC端接口，移动端显示二维码<br>
        <strong>❌ 问题：死循环</strong>
      </div>
    </div>

    <div class="warning">
      <strong>⚠️ 当前问题：</strong><br>
      使用 react-qr-code 生成 qrconnect 链接的二维码是不正确的做法。<br>
      qrconnect 链接本身是一个网页，不是二维码内容。
    </div>

    <h2>正确的实现方式</h2>

    <h3>方案1：使用微信提供的二维码图片（推荐）</h3>
    <div class="flow">
      <div class="flow-number">1</div>
      <div class="flow-content">
        <strong>调用接口获取二维码图片URL</strong><br>
        POST https://open.weixin.qq.com/connect/l/qrconnect?appid=xxx<br>
        返回二维码图片的URL（带UUID）
      </div>
    </div>
    <div class="flow">
      <div class="flow-number">2</div>
      <div class="flow-content">
        <strong>PC浏览器显示二维码图片</strong><br>
        使用 &lt;img&gt; 标签显示微信返回的二维码图片
      </div>
    </div>
    <div class="flow">
      <div class="flow-number">3</div>
      <div class="flow-content">
        <strong>手机微信扫码</strong><br>
        微信识别二维码后，在微信内显示"确认登录"界面<br>
        <strong>✅ 正确流程</strong>
      </div>
    </div>

    <div class="solution">
      <strong>✅ 解决方案：</strong><br>
      1. 调用微信开放平台接口获取二维码图片URL<br>
      2. 使用 &lt;img&gt; 显示微信提供的二维码图片<br>
      3. 轮询或长连接检测用户是否扫码确认<br>
      4. 确认后获取code并完成登录
    </div>

    <h3>方案2：使用第三方扫码登录SDK</h3>
    <pre>
// 使用微信官方JS-SDK
wxLogin({
  self_redirect: true,
  id: "login_container",
  appid: "wx0831611146088354",
  scope: "snsapi_login",
  redirect_uri: encodeURIComponent("https://hfb.yugioh.top/api/auth/wechat/callback"),
  state: "login",
  style: "white",
  href: ""
});
    </pre>

    <h2>关键区别</h2>
    <table border="1" cellpadding="10" style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr style="background:#f4f4f4;">
        <th>方式</th>
        <th>二维码内容</th>
        <th>扫码后行为</th>
        <th>结果</th>
      </tr>
      <tr>
        <td>react-qr-code（当前）</td>
        <td>qrconnect链接</td>
        <td>跳转到浏览器</td>
        <td>❌ 显示二维码，死循环</td>
      </tr>
      <tr>
        <td>微信二维码图片</td>
        <td>微信生成的UUID二维码</td>
        <td>微信内显示确认界面</td>
        <td>✅ 正常授权流程</td>
      </tr>
    </table>

    <h2>下一步建议</h2>
    <ol style="margin-left:20px; line-height:2;">
      <li>修改二维码生成逻辑，使用微信提供的二维码图片URL</li>
      <li>添加轮询机制，检测用户是否扫码确认</li>
      <li>或使用微信官方JS-SDK wxLogin() 方法</li>
    </ol>
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
