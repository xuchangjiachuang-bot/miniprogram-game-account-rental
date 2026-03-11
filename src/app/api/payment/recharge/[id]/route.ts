import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, paymentRecords } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录状态已失效，请重新登录' }, { status: 401 });
    }

    const { id } = await params;
    const recordList = await db
      .select()
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.id, id),
        eq(paymentRecords.userId, user.id),
        eq(paymentRecords.type, 'recharge'),
      ))
      .limit(1);

    if (recordList.length === 0) {
      return NextResponse.json({ success: false, error: '充值记录不存在' }, { status: 404 });
    }

    const record = recordList[0];
    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        amount: Number(record.amount) || 0,
        status: record.status,
        transactionId: record.transactionId,
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[Recharge Status] 查询充值状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '查询充值状态失败',
      },
      { status: 500 }
    );
  }
}
