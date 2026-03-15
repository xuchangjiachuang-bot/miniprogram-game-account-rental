import postgres from 'postgres';

let isUserBalanceSchemaInitialized = false;
const DATABASE_URL = process.env.PGDATABASE_URL || process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/database';
const schemaClient = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function ensureUserBalanceSchema() {
  if (isUserBalanceSchemaInitialized) {
    return;
  }

  try {
    await schemaClient`
      ALTER TABLE user_balances
      ADD COLUMN IF NOT EXISTS non_withdrawable_balance NUMERIC(10, 2) DEFAULT 0;
    `;

    isUserBalanceSchemaInitialized = true;
  } catch (error) {
    console.error('[initUserBalanceSchema] 初始化失败:', error);
    throw error;
  }
}
