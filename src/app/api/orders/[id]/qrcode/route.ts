import { NextRequest, NextResponse } from 'next/server';
import { db, orders, accounts } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 生成订单扫码登录二维码
 * GET /api/orders/{id}/qrcode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 获取订单信息
    const orderList = await db.select().from(orders).where(eq(orders.id, id));

    if (!orderList || orderList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订单不存在'
      }, { status: 404 });
    }

    const order = orderList[0];

    // 2. 获取账号信息
    const accountList = await db.select().from(accounts).where(eq(accounts.id, order.accountId));

    if (!accountList || accountList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '账号不存在'
      }, { status: 404 });
    }

    const account = accountList[0];

    // 3. 解析账号的登录信息
    const customAttributes = (account.customAttributes || {}) as {
      loginMethod?: string;
      qqAccount?: string;
      qqPassword?: string;
      platform?: string;
      province?: string;
      city?: string;
    };
    const loginMethod = customAttributes.loginMethod;
    const qqAccount = customAttributes.qqAccount;
    const qqPassword = customAttributes.qqPassword;

    if (!loginMethod) {
      return NextResponse.json({
        success: false,
        error: '账号登录信息不完整'
      }, { status: 400 });
    }

    // 4. 生成登录信息
    const loginInfo = {
      orderId: order.id,
      orderNo: order.orderNo,
      accountId: account.id,
      accountTitle: account.title,
      loginMethod,
      qqAccount,
      qqPassword: loginMethod === 'qq' || loginMethod === 'password' ? qqPassword : null,
      platform: customAttributes.platform,
      province: customAttributes.province,
      city: customAttributes.city,
      loginTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
    };

    // 5. 返回登录信息（实际项目中应该生成二维码，这里简化处理）
    return NextResponse.json({
      success: true,
      message: '登录信息获取成功',
      data: {
        // 这里应该返回一个二维码URL，但由于没有生成二维码的库，我们返回登录信息
        qrCodeUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(loginInfo))}`,
        loginInfo,
        // 二维码内容（可以用于生成二维码）
        qrCodeContent: JSON.stringify({
          type: 'account_login',
          orderId: order.id,
          timestamp: Date.now()
        })
      },
      // 如果需要生成真实的二维码，可以使用 qrcode 库
      // 这里提供两种使用方式：
      qrCodeOptions: {
        // 方式1：直接使用登录信息生成文本二维码
        textLogin: JSON.stringify(loginInfo),
        // 方式2：使用短链接（需要实现短链接服务）
        shortLink: `/api/orders/${order.id}/login?token=xxx`
      }
    });
  } catch (error: any) {
    console.error('生成登录二维码失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
