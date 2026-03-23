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

const DEFAULT_UNIT_LABEL = '\u4e2a';
const PLACEHOLDER_TEXT_PATTERN = /^[?\uFF1F\uFFFD]+$/;

const DEFAULT_ORDER_CONSUMPTION_CATALOG: OrderConsumptionCatalogItem[] = [
  { id: 'default-bullet', name: '\u5b50\u5f39', price: 1, unitLabel: DEFAULT_UNIT_LABEL, enabled: true },
  { id: 'default-armor', name: '\u62a4\u7532', price: 10, unitLabel: '\u4ef6', enabled: true },
  { id: 'default-medicine', name: '\u836f\u54c1', price: 5, unitLabel: DEFAULT_UNIT_LABEL, enabled: true },
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPlaceholderText(value: unknown) {
  const normalized = String(value || '').trim();
  return !normalized || PLACEHOLDER_TEXT_PATTERN.test(normalized);
}

function serializeCatalog(catalog: OrderConsumptionCatalogItem[]) {
  return JSON.stringify(
    catalog.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price.toFixed(2)),
      unitLabel: item.unitLabel,
      enabled: item.enabled !== false,
    })),
  );
}

function normalizeCatalogItem(item: unknown, index: number): OrderConsumptionCatalogItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const name = String(record.name || '').trim();
  if (!name || isPlaceholderText(name)) {
    return null;
  }

  const rawPrice = record.price ?? record.unitPrice ?? record.unit_price;
  const rawUnitLabel = record.unitLabel ?? record.unit_label ?? DEFAULT_UNIT_LABEL;
  const unitLabel = String(rawUnitLabel || '').trim();

  return {
    id: String(record.id || `catalog-${index + 1}`),
    name,
    price: Math.max(0, Number(toNumber(rawPrice).toFixed(2))),
    unitLabel: !unitLabel || isPlaceholderText(unitLabel) ? DEFAULT_UNIT_LABEL : unitLabel,
    enabled: record.enabled !== false,
  };
}

export function getDefaultOrderConsumptionCatalog() {
  return DEFAULT_ORDER_CONSUMPTION_CATALOG.map((item) => ({ ...item }));
}

export function normalizeOrderConsumptionCatalog(
  input: unknown,
  fallbackCatalog = getDefaultOrderConsumptionCatalog(),
) {
  if (!Array.isArray(input)) {
    return fallbackCatalog;
  }

  const normalized = input
    .map((item, index) => normalizeCatalogItem(item, index))
    .filter((item): item is OrderConsumptionCatalogItem => Boolean(item));

  return normalized.length > 0 ? normalized : fallbackCatalog;
}

export async function getOrderConsumptionCatalog() {
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY))
    .limit(1);
  if (!rows[0]) {
    return getDefaultOrderConsumptionCatalog();
  }

  const stored = rows[0].configValue;
  const normalized = normalizeOrderConsumptionCatalog(stored);
  const storedSerialized = Array.isArray(stored)
    ? serializeCatalog(normalizeOrderConsumptionCatalog(stored, normalized))
    : '';

  if (storedSerialized !== serializeCatalog(normalized)) {
    await db
      .update(systemConfig)
      .set({
        configValue: normalized,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY));
  }

  return normalized;
}

export async function saveOrderConsumptionCatalog(catalog: unknown) {
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, ORDER_CONSUMPTION_CATALOG_KEY))
    .limit(1);
  const now = new Date().toISOString();
  const fallbackCatalog = rows[0]
    ? normalizeOrderConsumptionCatalog(rows[0].configValue)
    : getDefaultOrderConsumptionCatalog();
  const normalized = normalizeOrderConsumptionCatalog(catalog, fallbackCatalog);

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
