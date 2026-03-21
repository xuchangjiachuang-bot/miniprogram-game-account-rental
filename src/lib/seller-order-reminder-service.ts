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
    content: `???????${sellerPhone}???????????????`,
  });

  const smsResult = await sendSms('aliyun', {
    phone: sellerPhone,
  });

  if (!smsResult.success) {
    console.warn(`[notifySellerAfterOrderPaid] ??????????: ${smsResult.message}`);
  }
}
