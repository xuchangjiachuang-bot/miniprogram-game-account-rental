import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { initAdminTable } from './init-admin';
import { initAgreementsTable } from './init-agreements';
import { initSearchContentTables } from './init-search-content';
import { initFinanceAuditTable } from './init-finance-audit';
import { initOrderConsumptionTables } from './init-order-consumption';
import { ensureUserBalanceSchema } from './init-user-balance';
import { ensureSchemaCompatibility } from './ensure-schema-compatibility';
import { smsConfigManager } from '../storage/database/smsConfigManager';
import * as adminSchema from '../storage/database/shared/admin-schema';

const DATABASE_URL = process.env.PGDATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://user_7602973286103941146:6d1a5e86-6de8-4164-a92d-73b867d5e94a@cp-sharp-tower-5511e9e0.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770207199429?sslmode=require&channel_binding=require';

const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const sqlClient = client;
export const db = drizzle(client);

export * from '../storage/database/shared/schema';
export { adminSchema as adminTables };

let isAdminInitialized = false;
export async function ensureAdminInitialized() {
  if (isAdminInitialized) {
    return;
  }

  await initAdminTable();
  isAdminInitialized = true;
}

let isAgreementsInitialized = false;
export async function ensureAgreementsInitialized() {
  if (isAgreementsInitialized) {
    return;
  }

  await initAgreementsTable();
  isAgreementsInitialized = true;
}

let isSmsConfigsInitialized = false;
export async function ensureSmsConfigsInitialized() {
  if (isSmsConfigsInitialized) {
    return;
  }

  await smsConfigManager.initDefaultConfigs();
  isSmsConfigsInitialized = true;
}

let isDBInitialized = false;
export async function ensureDatabaseInitialized() {
  if (isDBInitialized) {
    return;
  }

  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    await Promise.all([
      ensureSchemaCompatibility(),
      ensureAdminInitialized(),
      ensureAgreementsInitialized(),
      initSearchContentTables(),
      initFinanceAuditTable(),
      initOrderConsumptionTables(),
      ensureUserBalanceSchema(),
      ensureSmsConfigsInitialized(),
    ]);

    console.log('[Database] initialization completed');
    isDBInitialized = true;
  } catch (error) {
    console.error('[Database] initialization failed:', error);
  }
}
