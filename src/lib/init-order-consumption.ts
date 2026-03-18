import { db } from '@/lib/db';

let isOrderConsumptionInitialized = false;

export async function initOrderConsumptionTables() {
  if (isOrderConsumptionInitialized) {
    return;
  }

  try {
    await db.execute(`
      ALTER TABLE orders
      ALTER COLUMN status TYPE VARCHAR(40);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_consumption_settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id),
        buyer_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(30) NOT NULL DEFAULT 'pending_buyer_confirmation',
        pricing_version VARCHAR(50) NOT NULL DEFAULT 'default-v1',
        requested_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        approved_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        offline_settled_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        deposit_deducted_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        buyer_refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        seller_remark TEXT,
        buyer_remark TEXT,
        evidence JSONB,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        buyer_confirmed_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS order_consumption_settlements_order_id_idx
      ON order_consumption_settlements (order_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS order_consumption_settlements_status_idx
      ON order_consumption_settlements (status);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_consumption_settlement_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_id UUID NOT NULL REFERENCES order_consumption_settlements(id) ON DELETE CASCADE,
        item_name VARCHAR(100) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        unit_label VARCHAR(20) NOT NULL DEFAULT '个',
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
        remark TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS order_consumption_settlement_items_settlement_id_idx
      ON order_consumption_settlement_items (settlement_id);
    `);

    isOrderConsumptionInitialized = true;
  } catch (error) {
    console.error('[initOrderConsumptionTables] failed:', error);
    throw error;
  }
}
