import { randomUUID } from 'node:crypto';
import { db, financeAuditLogs } from './db';

type DBExecutor = Pick<typeof db, 'insert'>;

export interface FinanceAuditEventInput {
  eventType: string;
  status?: 'success' | 'failed' | 'pending';
  userId?: string | null;
  orderId?: string | null;
  paymentRecordId?: string | null;
  withdrawalId?: string | null;
  accountId?: string | null;
  amount?: number | string | null;
  currency?: string;
  balanceBefore?: number | string | null;
  balanceAfter?: number | string | null;
  details?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

function toDbNumeric(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : null;
}

export async function logFinanceAuditEvent(
  event: FinanceAuditEventInput,
  executor: DBExecutor = db,
) {
  await executor.insert(financeAuditLogs).values({
    id: randomUUID(),
    eventType: event.eventType,
    status: event.status || 'success',
    userId: event.userId || null,
    orderId: event.orderId || null,
    paymentRecordId: event.paymentRecordId || null,
    withdrawalId: event.withdrawalId || null,
    accountId: event.accountId || null,
    amount: toDbNumeric(event.amount),
    currency: event.currency || 'CNY',
    balanceBefore: toDbNumeric(event.balanceBefore),
    balanceAfter: toDbNumeric(event.balanceAfter),
    details: event.details || null,
    errorMessage: event.errorMessage || null,
    createdAt: new Date().toISOString(),
  });
}

export async function safeLogFinanceAuditEvent(
  event: FinanceAuditEventInput,
  executor: DBExecutor = db,
) {
  try {
    await logFinanceAuditEvent(event, executor);
  } catch (error) {
    console.error('[finance-audit] failed to write audit log:', error, event);
  }
}
