import { eq } from 'drizzle-orm';
import { accounts, db, orders, users } from '@/lib/db';
import { ensureOrderGroupChat, sendSystemGroupMessage } from '@/lib/chat-service-new';
import { sendSms } from '@/lib/sms-service';

function isValidMainlandMobile(phone?: string | null) {
  return /^1[3-9]\d{9}$/.test(phone?.trim() || '');
}

export async function notifySellerAfterOrderPaid(orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      accountId: orders.accountId,
      buyerId: orders.buyerId,
      sellerId: orders.sellerId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return;
  }

  const [account] = await db
    .select({
      title: accounts.title,
    })
    .from(accounts)
    .where(eq(accounts.id, order.accountId))
    .limit(1);

  const [buyer] = await db
    .select({
      nickname: users.nickname,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, order.buyerId))
    .limit(1);

  const [seller] = await db
    .select({
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, order.sellerId))
    .limit(1);

  const sellerPhone = isValidMainlandMobile(seller?.phone) ? seller?.phone || '' : '';
  const buyerPhone = isValidMainlandMobile(buyer?.phone) ? buyer?.phone || '' : '';

  if (!sellerPhone) {
    return;
  }

  const groupChat = await ensureOrderGroupChat(order.id);

  await sendSystemGroupMessage({
    groupId: groupChat.id,
    content: `卖家联系电话：${sellerPhone}，买家如需快速联系可直接拨打。`,
  });

  const smsResult = await sendSms('aliyun', {
    phone: sellerPhone,
    templateParam: {
      orderNo: order.orderNo,
      accountTitle: account?.title || '游戏账号',
      buyerName: buyer?.nickname || '买家',
      buyerPhone,
    },
  });

  if (!smsResult.success) {
    console.warn(`[notifySellerAfterOrderPaid] 卖家短信提醒发送失败: ${smsResult.message}`);
  }
}
