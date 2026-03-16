import { db } from '@/lib/db';

let isFinanceAuditInitialized = false;

export async function initFinanceAuditTable() {
  if (isFinanceAuditInitialized) {
    return;
  }

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS finance_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        user_id VARCHAR(36),
        order_id VARCHAR(36),
        payment_record_id VARCHAR(36),
        withdrawal_id VARCHAR(36),
        account_id VARCHAR(36),
        amount NUMERIC(10, 2),
        currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
        balance_before NUMERIC(10, 2),
        balance_after NUMERIC(10, 2),
        details JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS finance_audit_logs_event_type_idx
      ON finance_audit_logs (event_type);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS finance_audit_logs_order_id_idx
      ON finance_audit_logs (order_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS finance_audit_logs_payment_record_id_idx
      ON finance_audit_logs (payment_record_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS finance_audit_logs_user_id_idx
      ON finance_audit_logs (user_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS finance_audit_logs_withdrawal_id_idx
      ON finance_audit_logs (withdrawal_id);
    `);

    isFinanceAuditInitialized = true;
  } catch (error) {
    console.error('[initFinanceAuditTable] failed:', error);
    throw error;
  }
}
