import { NextRequest, NextResponse } from 'next/server';
import { db, admins, ensureDatabaseInitialized } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: '请输入用户名和密码',
        },
        { status: 400 }
      );
    }

    const adminList = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    if (adminList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '用户名或密码错误',
        },
        { status: 401 }
      );
    }

    const admin = adminList[0];
    if (admin.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: '账号已被禁用',
        },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          error: '用户名或密码错误',
        },
        { status: 401 }
      );
    }

    await db
      .update(admins)
      .set({
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(admins.id, admin.id));

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    response.cookies.set('admin_token', admin.id, {
      maxAge: 60 * 60 * 24,
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    });

    return response;
  } catch (error: any) {
    console.error('[管理员登录] 异常:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '登录失败',
      },
      { status: 500 }
    );
  }
}
