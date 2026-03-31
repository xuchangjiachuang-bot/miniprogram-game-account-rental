import { NextRequest, NextResponse } from 'next/server';
import { db, admins, users } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import { getPendingAuditAccounts } from '@/lib/account-audit-service';

/**
 * 获取待审核账号列表
 * GET /api/admin/accounts/pending-audit
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await getPendingAuditAccounts(page, pageSize);

    if (!result.success) {
      return NextResponse.json(result);
    }

    const pendingAccounts = result.data?.accounts || [];
    if (pendingAccounts.length === 0) {
      return NextResponse.json(result);
    }

    const sellerIds = Array.from(
      new Set(
        pendingAccounts
          .map((account: { sellerId?: string }) => account.sellerId)
          .filter(Boolean) as string[],
      ),
    );

    if (sellerIds.length === 0) {
      return NextResponse.json(result);
    }

    const sellerRows = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        phone: users.phone,
      })
      .from(users)
      .where(inArray(users.id, sellerIds));

    const sellerInfoMap = new Map(
      sellerRows.map((seller) => [
        seller.id,
        {
          sellerName: seller.nickname || '',
          sellerPhone: seller.phone || '',
        },
      ]),
    );

    const mergedAccounts = pendingAccounts.map((account: any) => ({
      ...account,
      ...(sellerInfoMap.get(account.sellerId) || {
        sellerName: '',
        sellerPhone: '',
      }),
    }));

    return NextResponse.json({
      ...result,
      data: {
        ...result.data,
        accounts: mergedAccounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
