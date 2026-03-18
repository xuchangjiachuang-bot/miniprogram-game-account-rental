import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { admins, db, ensureDatabaseInitialized } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({
        success: false,
        error: '未登录',
      }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '管理员不存在',
      }, { status: 401 });
    }

    const admin = adminList[0];
    if (admin.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: '账号已被禁用',
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
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取管理员信息失败';
    console.error('[GET /api/admin/auth/me] Failed:', error);
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
