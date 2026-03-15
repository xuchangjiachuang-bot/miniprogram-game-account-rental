import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, admins, commissionActivities } from '@/lib/db';

function normalizeDiscountRate(value: unknown) {
  return Math.max(0, Number(value) || 0).toFixed(2);
}

/**
 * 获取优惠活动
 * GET /api/admin/commission-activities
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // 前台发布页只需要读取当前生效活动，不要求管理员登录
    if (activeOnly) {
      const now = new Date().toISOString();
      const result = await db
        .select()
        .from(commissionActivities)
        .where(
          and(
            eq(commissionActivities.enabled, true),
            sql`${commissionActivities.startTime} <= ${now}`,
            sql`${commissionActivities.endTime} >= ${now}`
          )
        )
        .orderBy(commissionActivities.createdAt);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    if (adminList[0].status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const result = await db
      .select()
      .from(commissionActivities)
      .orderBy(commissionActivities.createdAt);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('获取优惠活动失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取优惠活动失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 创建优惠活动
 * POST /api/admin/commission-activities
 */
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    if (adminList[0].status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const body = await request.json();

    const [activity] = await db
      .insert(commissionActivities)
      .values({
        name: body.name,
        description: body.description,
        discountRate: normalizeDiscountRate(body.discountRate),
        startTime: body.startTime,
        endTime: body.endTime,
        enabled: body.enabled ?? false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: '优惠活动已创建',
      data: activity,
    });
  } catch (error: any) {
    console.error('创建优惠活动失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建优惠活动失败',
      },
      { status: 500 }
    );
  }
}
