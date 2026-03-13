import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { balanceTransactions, db, paymentRecords, userBalances, users } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { reconcileWechatWalletRechargeStatus } from '@/lib/wechat/payment-flow';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const paymentRecordId = typeof body.paymentRecordId === 'string' ? body.paymentRecordId : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const limit = Math.min(Math.max(Number(body.limit || 20), 1), 100);

    const pendingRecords = paymentRecordId
      ? await db
        .select()
        .from(paymentRecords)
        .where(and(
          eq(paymentRecords.id, paymentRecordId),
          eq(paymentRecords.type, 'recharge'),
          eq(paymentRecords.method, 'wechat'),
        ))
        .limit(1)
      : await db
        .select()
        .from(paymentRecords)
        .where(and(
          eq(paymentRecords.type, 'recharge'),
          eq(paymentRecords.method, 'wechat'),
          eq(paymentRecords.status, 'pending'),
        ))
        .orderBy(desc(paymentRecords.createdAt))
        .limit(limit);

    const relatedUsers = phone
      ? await db
        .select({
          id: users.id,
          phone: users.phone,
          nickname: users.nickname,
          wechatOpenid: users.wechatOpenid,
        })
        .from(users)
        .where(eq(users.phone, phone))
      : [];

    const relatedUserIds = relatedUsers.map((user) => user.id);
    const relatedPaymentRecords = relatedUserIds.length > 0
      ? await db
        .select()
        .from(paymentRecords)
        .where(inArray(paymentRecords.userId, relatedUserIds))
        .orderBy(desc(paymentRecords.createdAt))
        .limit(50)
      : [];

    const relatedBalances = relatedUserIds.length > 0
      ? await db
        .select()
        .from(userBalances)
        .where(inArray(userBalances.userId, relatedUserIds))
      : [];

    const relatedTransactions = relatedUserIds.length > 0
      ? await db
        .select()
        .from(balanceTransactions)
        .where(inArray(balanceTransactions.userId, relatedUserIds))
        .orderBy(desc(balanceTransactions.createdAt))
        .limit(50)
      : [];

    const results: Array<{
      id: string;
      beforeStatus: string;
      afterStatus?: string;
      error?: string;
    }> = [];

    for (const record of pendingRecords) {
      try {
        const reconciled = await reconcileWechatWalletRechargeStatus({
          paymentRecordId: record.id,
        });

        results.push({
          id: record.id,
          beforeStatus: record.status,
          afterStatus: reconciled.status,
        });
      } catch (error: any) {
        results.push({
          id: record.id,
          beforeStatus: record.status,
          error: error.message || '对账失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: pendingRecords.length,
        successCount: results.filter((item) => !item.error).length,
        failedCount: results.filter((item) => item.error).length,
        results,
        diagnostics: phone ? {
          phone,
          users: relatedUsers,
          paymentRecords: relatedPaymentRecords,
          balances: relatedBalances,
          transactions: relatedTransactions,
        } : undefined,
      },
    });
  } catch (error: any) {
    console.error('[Admin Payments] Reconcile recharge payments failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '支付对账失败',
    }, { status: 500 });
  }
}
