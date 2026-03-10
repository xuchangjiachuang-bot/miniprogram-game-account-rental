import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

/**
 * 重置管理员密码
 * POST /api/admin/admin-users/[id]/reset-password
 *
 * 请求体：
 * - newPassword: 新密码
 */
export async function POST(
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

    // 只有超级管理员可以重置其他管理员的密码
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    // 验证新密码
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码长度不能少于6位' },
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

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    await db
      .update(admins)
      .set({ password: hashedPassword, updatedAt: new Date().toISOString() })
      .where(eq(admins.id, id));

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error: any) {
    console.error('重置密码失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '重置密码失败' },
      { status: 500 }
    );
  }
}
