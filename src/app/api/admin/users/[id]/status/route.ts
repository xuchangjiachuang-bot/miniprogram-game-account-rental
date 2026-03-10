import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ success: false, error: '无效的状态' }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: status === 'active' ? '用户已启用' : '用户已禁用',
    });
  } catch (error: any) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新用户状态失败' },
      { status: 500 }
    );
  }
}