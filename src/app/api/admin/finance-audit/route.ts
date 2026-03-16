import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { db, financeAuditLogs } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const userId = searchParams.get('userId');
    const withdrawalId = searchParams.get('withdrawalId');
    const paymentRecordId = searchParams.get('paymentRecordId');
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200);

    const conditions = [];
    if (orderId) conditions.push(eq(financeAuditLogs.orderId, orderId));
    if (userId) conditions.push(eq(financeAuditLogs.userId, userId));
    if (withdrawalId) conditions.push(eq(financeAuditLogs.withdrawalId, withdrawalId));
    if (paymentRecordId) conditions.push(eq(financeAuditLogs.paymentRecordId, paymentRecordId));
    if (status) conditions.push(eq(financeAuditLogs.status, status));
    if (eventType) conditions.push(eq(financeAuditLogs.eventType, eventType));

    let query = db.select().from(financeAuditLogs).$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query
      .orderBy(desc(financeAuditLogs.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('[Admin Finance Audit] failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'FAILED_TO_LOAD_FINANCE_AUDIT_LOGS',
    }, { status: 500 });
  }
}
