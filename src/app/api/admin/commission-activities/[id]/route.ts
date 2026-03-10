import { NextRequest, NextResponse } from 'next/server';
import { db, admins, commissionActivities } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 更新优惠活动
 * PUT /api/admin/commission-activities/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
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

    const admin = adminList[0];

    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [activity] = await db
      .update(commissionActivities)
      .set({
        name: body.name,
        description: body.description,
        discountRate: body.discountRate,
        startTime: body.startTime,
        endTime: body.endTime,
        enabled: body.enabled
      })
      .where(eq(commissionActivities.id, id))
      .returning();

    if (!activity) {
      return NextResponse.json({
        success: false,
        error: '优惠活动不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '优惠活动已更新',
      data: activity
    });
  } catch (error: any) {
    console.error('更新优惠活动失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '更新优惠活动失败'
    }, { status: 500 });
  }
}

/**
 * 删除优惠活动
 * DELETE /api/admin/commission-activities/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
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

    const admin = adminList[0];

    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const { id } = await params;

    const result = await db
      .delete(commissionActivities)
      .where(eq(commissionActivities.id, id));

    if (!result) {
      return NextResponse.json({
        success: false,
        error: '优惠活动不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '优惠活动已删除'
    });
  } catch (error: any) {
    console.error('删除优惠活动失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '删除优惠活动失败'
    }, { status: 500 });
  }
}
