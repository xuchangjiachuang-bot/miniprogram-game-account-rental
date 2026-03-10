import { NextRequest, NextResponse } from 'next/server';
import { db, wecomCustomerService } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const {
      corpId,
      agentId,
      secret,
      token,
      encodingAESKey,
      kfAvatar,
      kfQrCode,
      kfUrl,
      autoReply,
      welcomeMessage,
      offlineMessage,
      busyMessage,
      showOnHomepage,
      showOnOrderPage,
      showOnSellerPage,
      floatingButtonEnabled,
      floatingButtonPosition,
      floatingButtonColor,
      status,
      isEnabled,
    } = body;

    if (!corpId || !agentId || !secret) {
      return NextResponse.json(
        { success: false, error: 'Missing required customer service fields' },
        { status: 400 }
      );
    }

    const existing = await db.select().from(wecomCustomerService).limit(1);

    const configData = {
      corpId,
      agentId,
      secret,
      token: token || '',
      encodingAESKey: encodingAESKey || '',
      kfId: '',
      kfName: '在线客服',
      kfAvatar: kfAvatar || '',
      kfQrCode: kfQrCode || '',
      kfUrl: kfUrl || '',
      autoReply: autoReply ?? true,
      welcomeMessage: welcomeMessage || '您好，欢迎咨询，请问有什么可以帮助您？',
      offlineMessage: offlineMessage || '客服当前不在线，请您留言，我们会尽快回复。',
      busyMessage: busyMessage || '客服当前忙碌中，请稍后再试。',
      showOnHomepage: showOnHomepage ?? true,
      showOnOrderPage: showOnOrderPage ?? true,
      showOnSellerPage: showOnSellerPage ?? true,
      floatingButtonEnabled: floatingButtonEnabled ?? true,
      floatingButtonPosition: floatingButtonPosition || 'right',
      floatingButtonColor: floatingButtonColor || '#07C160',
      status: status || 'online',
      isEnabled: isEnabled ?? true,
      updatedAt: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await db
        .update(wecomCustomerService)
        .set(configData)
        .where(eq(wecomCustomerService.id, existing[0].id));
    } else {
      await db.insert(wecomCustomerService).values({
        ...configData,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: 'Customer service config saved' });
  } catch (error: any) {
    console.error('Failed to save customer service config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save customer service config' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const configs = await db.select().from(wecomCustomerService).limit(1);

    if (configs.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: configs[0] });
  } catch (error: any) {
    console.error('Failed to load customer service config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load customer service config' },
      { status: 500 }
    );
  }
}
