import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * 修改管理员密码
 * POST /api/admin/auth/update-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 从Cookie中获取admin_token
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: '请提供当前密码和新密码'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: '新密码长度至少为6位'
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

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await db
      .update(admins)
      .set({
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(admins.id, admin.id));

    return NextResponse.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error: any) {
    console.error('修改密码失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '修改密码失败'
    }, { status: 500 });
  }
}
