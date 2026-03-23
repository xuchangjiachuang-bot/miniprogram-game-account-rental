import { eq } from 'drizzle-orm';
import { db, systemConfig } from '@/lib/db';

const ORDER_CONSUMPTION_CATALOG_KEY = 'order_consumption_catalog';

export type OrderConsumptionCatalogItem = {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
  enabled: boolean;
};

const DEFAULT_ORDER_CONSUMPTION_CATALOG: OrderConsumptionCatalogItem[] = [
  { id: 'default-bullet', name: '子弹', price: 1, unitLabel: '个', enabled: true },
  { id: 'default-armor', name: '护甲', price: 10, unitLabel: '件', enabled: true },
  { id: 'default-medicine', name: '药品', price: 5, unitLabel: '个', enabled: true },
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCatalogItem(item: unknown, index: number): OrderConsumptionCatalogItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const name = String(record.name || '').trim();
  if (!name) {
    return null;
  }

  const rawPrice = record.price ?? record.unitPrice ?? record.unit_price;
  const rawUnitLabel = record.unitLabel ?? record.unit_label ?? '个';

  return {
    id: String(record.id || `catalog-${index + 1}`),
    name,
    price: Math.max(0, Number(toNumber(rawPrice).toFixed(2))),
    unitLabel: String(rawUnitLabel).trim() || '个',
    enabled: record.enabled !== false,
  };
}

export function getDefaultOrderConsumptionCatalog() {
  return DEFAULT_ORDER_CONSUMPTION_CATALOG.map((item) => ({ ...item }));
}

export function normalizeOrderConsumptionCatalog(input: unknown) {
  if (!Array.isArray(input)) {
    return getDefaultOrderConsumptionCatalog();
  }

  const normalized = input
    .map((item, index) => normalizeCatalogItem(item, index))
    .filter((item): item is OrderConsumptionCatalogItem => Boolean(item));

  return normalized.length > 0 ? normalized : getDefaultOrderConsumptionCatalog();
}

export async function getOrderConsumptionCatalog() {
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY))
    .limit(1);

  const stored = rows[0]?.configValue;
  return normalizeOrderConsumptionCatalog(stored);
}

export async function saveOrderConsumptionCatalog(catalog: unknown) {
  const normalized = normalizeOrderConsumptionCatalog(catalog);
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY))
    .limit(1);

  if (rows[0]) {
    await db
      .update(systemConfig)
      .set({
        configValue: normalized,
        updatedAt: now,
      })
      .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY));
  } else {
    await db.insert(systemConfig).values({
      configKey: ORDER_CONSUMPTION_CATALOG_KEY,
      configValue: normalized,
      description: '订单资源消耗结算模板',
      createdAt: now,
      updatedAt: now,
    });
  }

  return normalized;
}
