import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq, desc, count } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

/**
 * 获取管理员列表
 * GET /api/admin/admin-users
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认20）
 * - status: 状态筛选（active, suspended）
 * - search: 搜索关键词（用户名）
 */
export async function GET(request: NextRequest) {
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

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 构建查询条件
    let query = db.select().from(admins);

    if (status && status !== 'all') {
      query = query.where(eq(admins.status, status as 'active' | 'suspended')) as any;
    }

    if (search) {
      query = query.where(eq(admins.username, search)) as any;
    }

    const allAdmins = await query.orderBy(desc(admins.createdAt)) as any;

    // 分页
    const offset = (page - 1) * pageSize;
    const paginatedAdmins = allAdmins.slice(offset, offset + pageSize);

    // 移除密码字段
    const safeAdmins = paginatedAdmins.map((admin: any) => {
      const { password, ...safeAdmin } = admin;
      return safeAdmin;
    });

    return NextResponse.json({
      success: true,
      data: safeAdmins,
      total: allAdmins.length,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('获取管理员列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取管理员列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建管理员账号
 * POST /api/admin/admin-users
 *
 * 请求体：
 * - username: 用户名
 * - password: 密码
 * - realName: 真实姓名
 * - role: 角色（superadmin, admin）
 */
export async function POST(request: NextRequest) {
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

    // 只有超级管理员可以创建其他管理员
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, realName, role } = body;

    // 验证必填字段
    if (!username || !password || !realName || !role) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingAdmins = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (existingAdmins.length > 0) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 验证角色
    if (!['superadmin', 'admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: '无效的角色' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建管理员（让数据库自动生成UUID作为ID）
    const [newAdmin] = await db
      .insert(admins)
      .values({
        username,
        password: hashedPassword,
        name: realName,
        role,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // 移除密码字段
    const { password: _, ...safeAdmin } = newAdmin as any;

    return NextResponse.json({
      success: true,
      data: safeAdmin,
      message: '管理员账号创建成功',
    });
  } catch (error: any) {
    console.error('创建管理员账号失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建管理员账号失败' },
      { status: 500 }
    );
  }
}
