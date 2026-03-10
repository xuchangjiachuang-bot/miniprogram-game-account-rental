import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { admins, db } from '@/lib/db';

export async function requireAdmin(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;

  if (!adminToken) {
    return {
      error: NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      ),
    };
  }

  const adminList = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminToken))
    .limit(1);

  if (adminList.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: '管理员不存在' },
        { status: 401 }
      ),
    };
  }

  const admin = adminList[0];

  if (admin.status !== 'active') {
    return {
      error: NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      ),
    };
  }

  return { admin };
}
