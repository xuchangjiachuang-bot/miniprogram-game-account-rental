import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * 修改管理员用户名
 * POST /api/admin/auth/update-username
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newUsername } = body;

    // 从Cookie中获取admin_token
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    if (!currentPassword || !newUsername) {
      return NextResponse.json({
        success: false,
        error: '请提供当前密码和新用户名'
      }, { status: 400 });
    }

    // 查找当前管理员
    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '管理员不存在'
      }, { status: 401 });
    }

    const admin = adminList[0];

    // 验证当前密码
    const passwordMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!passwordMatch) {
      return NextResponse.json({
        success: false,
        error: '当前密码错误'
      }, { status: 401 });
    }

    // 检查新用户名是否已存在
    const existingAdmin = await db
      .select()
      .from(admins)
      .where(eq(admins.username, newUsername))
      .limit(1);

    if (existingAdmin.length > 0 && existingAdmin[0].id !== admin.id) {
      return NextResponse.json({
        success: false,
        error: '用户名已存在'
      }, { status: 400 });
    }

    // 更新用户名
    await db
      .update(admins)
      .set({
        username: newUsername,
        updatedAt: new Date().toISOString()
      })
      .where(eq(admins.id, admin.id));

    return NextResponse.json({
      success: true,
      message: '用户名修改成功'
    });
  } catch (error: any) {
    console.error('修改用户名失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '修改用户名失败'
    }, { status: 500 });
  }
}
