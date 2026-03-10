import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

/**
 * 获取管理员详情
 * GET /api/admin/admin-users/[id]
 */
export async function GET(
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

    // 查询管理员详情
    const targetAdminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    if (!targetAdminList || targetAdminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 404 });
    }

    const targetAdmin = targetAdminList[0];

    // 移除密码字段
    const { password, ...safeAdmin } = targetAdmin as any;

    return NextResponse.json({
      success: true,
      data: safeAdmin,
    });
  } catch (error: any) {
    console.error('获取管理员详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取管理员详情失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新管理员状态
 * PUT /api/admin/admin-users/[id]
 *
 * 请求体：
 * - status: 状态（active, suspended）
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

    // 只有超级管理员可以更改其他管理员的状态
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // 验证状态
    if (!['active', 'suspended'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态' },
        { status: 400 }
      );
    }

    // 查询目标管理员
    const targetAdminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    if (!targetAdminList || targetAdminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 404 });
    }

    const targetAdmin = targetAdminList[0];

    // 不能禁用自己
    if (targetAdmin.id === admin.id) {
      return NextResponse.json(
        { success: false, error: '不能禁用自己' },
        { status: 400 }
      );
    }

    // 不能禁用其他超级管理员
    if (targetAdmin.role === 'superadmin') {
      return NextResponse.json(
        { success: false, error: '不能禁用超级管理员' },
        { status: 400 }
      );
    }

    // 更新状态
    await db
      .update(admins)
      .set({ status: status as 'active' | 'suspended', updatedAt: new Date().toISOString() })
      .where(eq(admins.id, id));

    return NextResponse.json({
      success: true,
      message: '管理员状态更新成功',
    });
  } catch (error: any) {
    console.error('更新管理员状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新管理员状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除管理员
 * DELETE /api/admin/admin-users/[id]
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

    // 只有超级管理员可以删除其他管理员
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;

    // 查询目标管理员
    const targetAdminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    if (!targetAdminList || targetAdminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 404 });
    }

    const targetAdmin = targetAdminList[0];

    // 不能删除自己
    if (targetAdmin.id === admin.id) {
      return NextResponse.json(
        { success: false, error: '不能删除自己' },
        { status: 400 }
      );
    }

    // 不能删除其他超级管理员
    if (targetAdmin.role === 'superadmin') {
      return NextResponse.json(
        { success: false, error: '不能删除超级管理员' },
        { status: 400 }
      );
    }

    // 删除管理员
    await db.delete(admins).where(eq(admins.id, id));

    return NextResponse.json({
      success: true,
      message: '管理员删除成功',
    });
  } catch (error: any) {
    console.error('删除管理员失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除管理员失败' },
      { status: 500 }
    );
  }
}

