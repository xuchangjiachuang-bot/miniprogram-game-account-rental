import { sql } from 'drizzle-orm';

type SqlExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

async function lockFinanceScope(executor: SqlExecutor, scopeKey: string) {
  await executor.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${scopeKey}, 0))`,
  );
}

export async function lockOrderFinanceScope(executor: SqlExecutor, orderId: string) {
  await lockFinanceScope(executor, `order-finance:${orderId}`);
}

export async function lockPaymentRecordScope(executor: SqlExecutor, paymentRecordId: string) {
  await lockFinanceScope(executor, `payment-record:${paymentRecordId}`);
}

export async function lockUserFinanceScope(executor: SqlExecutor, userId: string) {
  await lockFinanceScope(executor, `user-finance:${userId}`);
}

export async function lockWithdrawalFinanceScope(executor: SqlExecutor, withdrawalId: string) {
  await lockFinanceScope(executor, `withdrawal-finance:${withdrawalId}`);
}
