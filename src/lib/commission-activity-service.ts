import { and, asc, eq, sql } from 'drizzle-orm';
import { commissionActivities, db } from './db';

export interface ActiveCommissionActivity {
  id: string;
  name: string;
  description: string | null;
  discountRate: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export async function getActiveCommissionActivity(): Promise<ActiveCommissionActivity | null> {
  const now = new Date().toISOString();
  const [activity] = await db
    .select()
    .from(commissionActivities)
    .where(
      and(
        eq(commissionActivities.enabled, true),
        sql`${commissionActivities.startTime} <= ${now}`,
        sql`${commissionActivities.endTime} >= ${now}`
      )
    )
    .orderBy(asc(commissionActivities.createdAt))
    .limit(1);

  if (!activity) {
    return null;
  }

  return {
    ...activity,
    discountRate: Number(activity.discountRate) || 0,
  };
}

export async function getEffectiveCommissionRate(baseCommissionRate: number) {
  const activity = await getActiveCommissionActivity();
  const discountRate = activity?.discountRate || 0;
  const effectiveRate = Math.max(0, baseCommissionRate - discountRate);

  return {
    activity,
    discountRate,
    effectiveRate,
  };
}
