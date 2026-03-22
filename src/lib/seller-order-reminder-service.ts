import { eq } from 'drizzle-orm';
import { db, orders, users } from '@/lib/db';
import { ensureOrderGroupChat, sendSystemGroupMessage } from '@/lib/chat-service-new';
import { sendSms } from '@/lib/sms-service';

function isValidMainlandMobile(phone?: string | null) {
  return /^1[3-9]\d{9}$/.test(phone?.trim() || '');
}

export async function notifySellerAfterOrderPaid(orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      sellerId: orders.sellerId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return;
  }

  const [seller] = await db
    .select({
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, order.sellerId))
    .limit(1);

  const sellerPhone = isValidMainlandMobile(seller?.phone) ? seller?.phone || '' : '';
  if (!sellerPhone) {
    return;
  }

  const groupChat = await ensureOrderGroupChat(order.id);

  await sendSystemGroupMessage({
    groupId: groupChat.id,
    content:
      `\u7cfb\u7edf\u63d0\u9192\uff1a\u5356\u5bb6\u624b\u673a\u53f7 ${sellerPhone} \u5df2\u6536\u5230\u4ed8\u6b3e\u901a\u77e5\uff0c\u8bf7\u5c3d\u5feb\u8054\u7cfb\u4e70\u5bb6\u5f00\u59cb\u670d\u52a1\u3002`,
  });

  const smsResult = await sendSms('aliyun', {
    phone: sellerPhone,
  });

  if (!smsResult.success) {
    console.warn('[notifySellerAfterOrderPaid] \u5356\u5bb6\u4ed8\u6b3e\u63d0\u9192\u77ed\u4fe1\u53d1\u9001\u5931\u8d25:', smsResult.message);
  }
}
