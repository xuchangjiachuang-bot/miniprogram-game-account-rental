import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { accounts, balanceTransactions, db, orders, paymentRecords, userBalances } from '@/lib/db';
import { getLatestConsumptionSettlement } from '@/lib/order-consumption-service';
import { getOrderDispute } from '@/lib/dispute-service';
import { syncSingleOrderLifecycle } from '@/lib/order-lifecycle-service';
import { cancelOrder, transformDbOrderToApiFormat } from '@/lib/order-service';
import { getPaymentTimeoutSeconds, isOrderTimeout } from '@/lib/order-timeout-service';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { sendAccountRentedNotification } from '@/lib/notification-service';
import { getServerUserId } from '@/lib/server-auth';
import { ensureOrderGroupChat } from '@/lib/chat-service-new';
import { reconcileWechatOrderStatus } from '@/lib/wechat/payment-flow';
import { notifySellerAfterOrderPaid } from '@/lib/seller-order-reminder-service';

class OrderPayError extends Error {
  code: string;
  availableBalance?: number;
  requiredAmount?: number;

  constructor(code: string, message: string, details?: { availableBalance?: number; requiredAmount?: number }) {
    super(message);
    this.name = 'OrderPayError';
    this.code = code;
    this.availableBalance = details?.availableBalance;
    this.requiredAmount = details?.requiredAmount;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    let orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    if (orderList[0].status === 'pending_payment') {
      try {
        if (await isOrderTimeout(id)) {
          await cancelOrder(id, '支付超时自动取消');
          orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
        } else {
          const reconciledOrder = await reconcileWechatOrderStatus(id);
          orderList = [reconciledOrder];
        }
      } catch (error) {
        console.warn('[Order Detail] Failed to reconcile payment status:', error);
      }
    }

    try {
      const syncedOrder = await syncSingleOrderLifecycle(id);
      if (syncedOrder) {
        orderList = [syncedOrder];
      }
    } catch (error) {
      console.warn('[Order Detail] Failed to sync lifecycle status:', error);
    }

    const order = orderList[0];
    if (![order.buyerId, order.sellerId].includes(userId)) {
      return NextResponse.json({ success: false, error: '无权查看该订单' }, { status: 403 });
    }

    const dispute = await getOrderDispute(order.id);
    const consumptionSettlement = await getLatestConsumptionSettlement(order.id);
    const paymentTimeoutSeconds = await getPaymentTimeoutSeconds();
    const viewerRole = order.buyerId === userId ? 'buyer' : 'seller';

    return NextResponse.json({
      success: true,
      data: {
        ...transformDbOrderToApiFormat(order),
        dispute,
        consumptionSettlement,
        paymentTimeoutSeconds,
        viewerRole,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '获取订单详情失败',
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    const orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];

    if (action === 'pay') {
      if (order.buyerId !== userId) {
        return NextResponse.json({ success: false, error: '只有买家可以支付订单' }, { status: 403 });
      }

      if (order.status !== 'pending_payment') {
        return NextResponse.json({
          success: false,
          error: `当前订单状态不可支付：${order.status}`,
        }, { status: 400 });
      }

      const totalAmount = Number(order.totalPrice || 0);
      const depositAmount = Number(order.deposit || 0);
      const rentalAmount = Math.max(0, totalAmount - depositAmount);
      const rentalHours = Number(order.rentalDuration) || 24;

      if (totalAmount <= 0) {
        return NextResponse.json({ success: false, error: '订单金额异常，无法支付' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const endTime = new Date(Date.now() + rentalHours * 60 * 60 * 1000).toISOString();

      try {
        await db.transaction(async (tx) => {
        await tx
          .insert(userBalances)
          .values({
            id: crypto.randomUUID(),
            userId,
            availableBalance: '0',
            frozenBalance: '0',
            totalWithdrawn: '0',
            totalEarned: '0',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: userBalances.userId });

        const updatedBalances = await tx
          .update(userBalances)
          .set({
            availableBalance: sql`${userBalances.availableBalance} - ${totalAmount.toFixed(2)}`,
            frozenBalance: sql`${userBalances.frozenBalance} + ${depositAmount.toFixed(2)}`,
            updatedAt: now,
          })
          .where(and(
            eq(userBalances.userId, userId),
            sql`${userBalances.availableBalance} >= ${totalAmount.toFixed(2)}`,
          ))
          .returning({
            availableBalance: userBalances.availableBalance,
            frozenBalance: userBalances.frozenBalance,
          });

        if (updatedBalances.length === 0) {
          const [latestBalance] = await tx
            .select()
            .from(userBalances)
            .where(eq(userBalances.userId, userId))
            .limit(1);

          throw new OrderPayError('INSUFFICIENT_AVAILABLE_BALANCE', '余额不足', {
            availableBalance: Number(latestBalance?.availableBalance || 0),
            requiredAmount: totalAmount,
          });
        }

        const claimedOrders = await tx
          .update(orders)
          .set({
            status: 'active',
            paymentMethod: 'wallet',
            paymentTime: now,
            startTime: now,
            endTime,
            updatedAt: now,
          })
          .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment')))
          .returning({ id: orders.id });

        if (claimedOrders.length === 0) {
          throw new OrderPayError('ORDER_ALREADY_PAID', '订单已支付，请勿重复提交');
        }

        const newAvailableBalance = Number(updatedBalances[0].availableBalance || 0);
        const newFrozenBalance = Number(updatedBalances[0].frozenBalance || 0);
        const availableBalance = newAvailableBalance + totalAmount;
        const frozenBalance = newFrozenBalance - depositAmount;

        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId,
          orderId: order.id,
          transactionType: 'order_payment',
          amount: rentalAmount.toFixed(2),
          balanceBefore: availableBalance.toFixed(2),
          balanceAfter: (availableBalance - rentalAmount).toFixed(2),
          description: `订单 ${order.orderNo} 余额支付租金`,
          createdAt: now,
        });

        if (depositAmount > 0) {
          await tx.insert(balanceTransactions).values({
            id: crypto.randomUUID(),
            userId,
            orderId: order.id,
            transactionType: 'deposit_freeze',
            amount: depositAmount.toFixed(2),
            balanceBefore: (availableBalance - rentalAmount).toFixed(2),
            balanceAfter: (availableBalance - totalAmount).toFixed(2),
            description: `订单 ${order.orderNo} 余额支付押金冻结`,
            createdAt: now,
          });
        }


        const [existingPayment] = await tx
          .select({ id: paymentRecords.id })
          .from(paymentRecords)
          .where(and(
            eq(paymentRecords.orderId, order.id),
            eq(paymentRecords.type, 'payment'),
            eq(paymentRecords.method, 'wallet'),
          ))
          .limit(1);

        if (!existingPayment) {
          await tx.insert(paymentRecords).values({
            id: crypto.randomUUID(),
            orderId: order.id,
            orderNo: order.orderNo,
            userId,
            amount: totalAmount.toFixed(2),
            type: 'payment',
            method: 'wallet',
            transactionId: '',
            thirdPartyOrderId: order.id,
            status: 'success',
            createdAt: now,
            updatedAt: now,
          });
        } else {
          await tx
            .update(paymentRecords)
            .set({
              amount: totalAmount.toFixed(2),
              status: 'success',
              failureReason: null,
              updatedAt: now,
            })
            .where(eq(paymentRecords.id, existingPayment.id));
        }

        await tx
          .update(accounts)
          .set({
            status: 'rented',
            updatedAt: now,
          })
          .where(eq(accounts.id, order.accountId));

        await safeLogFinanceAuditEvent({
          eventType: 'order_payment_wallet_paid',
          status: 'success',
          userId,
          orderId: order.id,
          amount: totalAmount,
          balanceBefore: availableBalance,
          balanceAfter: availableBalance - totalAmount,
          details: {
            orderNo: order.orderNo,
            paymentMethod: 'wallet',
            rentalAmount,
            depositAmount,
            frozenBalanceBefore: frozenBalance,
            frozenBalanceAfter: frozenBalance + depositAmount,
          },
        }, tx);
        });
      } catch (error) {
        if (error instanceof OrderPayError) {
          if (error.code === 'ORDER_ALREADY_PAID') {
            return NextResponse.json({
              success: false,
              error: '订单已支付，请勿重复提交',
              code: error.code,
            }, { status: 409 });
          }

          return NextResponse.json({
            success: false,
            error: '余额不足',
            code: error.code,
            data: {
              availableBalance: error.availableBalance,
              requiredAmount: error.requiredAmount,
            },
          }, { status: 400 });
        }

        throw error;
      }

      const groupChat = await ensureOrderGroupChat(order.id);
      await sendAccountRentedNotification({
        orderId: order.id,
        chatGroupId: groupChat.id,
        qrCodeUrl: `/api/orders/${order.id}/qrcode`,
      });
      await notifySellerAfterOrderPaid(order.id);

      return NextResponse.json({
        success: true,
        message: '余额支付成功',
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: 'active',
          paymentMethod: 'wallet',
          startTime: now,
          endTime,
        },
      });
    }

    if (action === 'cancel') {
      if (order.buyerId !== userId) {
        return NextResponse.json({ success: false, error: '只有买家可以取消订单' }, { status: 403 });
      }

      if (order.status !== 'pending_payment') {
        return NextResponse.json({
          success: false,
          error: `当前订单状态不能取消：${order.status}`,
        }, { status: 400 });
      }

      const result = await cancelOrder(id, '买家主动取消待支付订单');
      return NextResponse.json({
        success: result.success,
        message: result.message,
        error: result.success ? undefined : result.message,
        data: result.success
          ? {
              orderId: id,
              orderNo: order.orderNo,
              status: 'cancelled',
            }
          : undefined,
      }, { status: result.success ? 200 : 400 });
    }

    if (action !== 'complete') {
      return NextResponse.json({ success: false, error: '未知的操作' }, { status: 400 });
    }

    if (order.buyerId !== userId) {
      return NextResponse.json({ success: false, error: '只有买家可以归还账号' }, { status: 403 });
    }

    if (order.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `当前订单状态不能归还：${order.status}`,
      }, { status: 400 });
    }

    if (order.isSettled) {
      return NextResponse.json({ success: false, error: '订单已分账，不能重复操作' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await db
      .update(orders)
      .set({
        status: 'pending_verification',
        actualEndTime: now,
        verificationRequestTime: now,
        verificationDeadline: deadline,
        verificationResult: 'pending',
        updatedAt: now,
      })
      .where(eq(orders.id, id));

    return NextResponse.json({
      success: true,
      message: '账号归还成功，等待卖家验收',
      data: {
        orderId: id,
        orderNo: order.orderNo,
        status: 'pending_verification',
        verificationDeadline: deadline,
        note: '卖家验号通过后将自动完成并分账，如发现异常可发起纠纷。',
      },
    });
  } catch (error: any) {
    console.error('处理订单操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '处理订单操作失败',
    }, { status: 500 });
  }
}
