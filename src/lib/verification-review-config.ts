import { eq } from 'drizzle-orm';
import { db, systemConfig } from '@/lib/db';

const VERIFICATION_MANUAL_REVIEW_KEY = 'verification_manual_review_enabled';

function normalizeBooleanConfig(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

export async function getVerificationManualReviewEnabled() {
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, VERIFICATION_MANUAL_REVIEW_KEY))
    .limit(1);

  return normalizeBooleanConfig(rows[0]?.configValue, true);
}

export async function saveVerificationManualReviewEnabled(enabled: boolean) {
  const rows = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, VERIFICATION_MANUAL_REVIEW_KEY))
    .limit(1);

  const now = new Date().toISOString();

  if (rows[0]) {
    await db
      .update(systemConfig)
      .set({
        configValue: enabled,
        updatedAt: now,
      })
      .where(eq(systemConfig.configKey, VERIFICATION_MANUAL_REVIEW_KEY));
  } else {
    await db.insert(systemConfig).values({
      configKey: VERIFICATION_MANUAL_REVIEW_KEY,
      configValue: enabled,
      description: '实名认证人工审核开关',
      createdAt: now,
      updatedAt: now,
    });
  }

  return enabled;
}
