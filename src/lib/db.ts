import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { initAdminTable } from './init-admin';
import { initAgreementsTable } from './init-agreements';
import { initSearchContentTables } from './init-search-content';
import { initFinanceAuditTable } from './init-finance-audit';
import { initOrderConsumptionTables } from './init-order-consumption';
import { ensureUserBalanceSchema } from './init-user-balance';
import { smsConfigManager } from '../storage/database/smsConfigManager';
import * as adminSchema from '../storage/database/shared/admin-schema';

// 数据库连接配置
const DATABASE_URL = process.env.PGDATABASE_URL || process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/database';

// 创建Postgres连接
const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const sqlClient = client;

// 创建Drizzle实例
export const db = drizzle(client);

// 导出schema
export * from '../storage/database/shared/schema';
export { adminSchema as adminTables };

// 自动初始化管理员表
let isInitialized = false;
export async function ensureAdminInitialized() {
  if (!isInitialized) {
    await initAdminTable();
    isInitialized = true;
  }
}

// 自动初始化协议表
let isAgreementsInitialized = false;
export async function ensureAgreementsInitialized() {
  if (!isAgreementsInitialized) {
    await initAgreementsTable();
    isAgreementsInitialized = true;
  }
}

// 自动初始化短信配置
let isSmsConfigsInitialized = false;
export async function ensureSmsConfigsInitialized() {
  if (!isSmsConfigsInitialized) {
    await smsConfigManager.initDefaultConfigs();
    isSmsConfigsInitialized = true;
  }
}

// 统一的数据库初始化函数
let isDBInitialized = false;
export async function ensureDatabaseInitialized() {
  if (!isDBInitialized) {
    // 只在运行时（非构建环境）初始化
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
      try {
        await Promise.all([
          ensureAdminInitialized(),
          ensureAgreementsInitialized(),
          initSearchContentTables(),
          initFinanceAuditTable(),
          initOrderConsumptionTables(),
          ensureUserBalanceSchema(),
          ensureSmsConfigsInitialized(),
        ]);
        console.log('[Database] 初始化完成');
        isDBInitialized = true;
      } catch (error) {
        console.error('[Database] 初始化失败:', error);
        // 初始化失败不阻塞应用启动
      }
    }
  }
}
