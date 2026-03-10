import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 获取当前管理员信息
 * GET /api/admin/auth/me
 */
export async function GET(request: NextRequest) {
  try {
    // 从Cookie中获取admin_token
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    // 查找管理员
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

    // 检查账号状态
    if (admin.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: '账号已被禁用'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt
      }
    });
  } catch (error: any) {
    console.error('获取管理员信息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取管理员信息失败'
    }, { status: 500 });
  }
}
