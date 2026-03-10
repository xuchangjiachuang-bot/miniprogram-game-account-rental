import { NextRequest, NextResponse } from 'next/server';
import { db, accounts, orders, users } from '@/lib/db';
import { and, desc, eq, inArray, like, or } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status));
    }

    if (search) {
      conditions.push(like(orders.orderNo, `%${search}%`));
    }

    let query = db.select().from(orders);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(orders.createdAt)) as any;

    const allOrders = await query;
    const offset = (page - 1) * pageSize;
    const paginatedOrders = allOrders.slice(offset, offset + pageSize);

    const buyerIds = [...new Set(paginatedOrders.map((order) => order.buyerId).filter(Boolean))];
    const sellerIds = [...new Set(paginatedOrders.map((order) => order.sellerId).filter(Boolean))];
    const accountIds = [...new Set(paginatedOrders.map((order) => order.accountId).filter(Boolean))];

    const relatedUsers = buyerIds.length + sellerIds.length > 0
      ? await db
          .select({
            id: users.id,
            phone: users.phone,
            nickname: users.nickname,
          })
          .from(users)
          .where(inArray(users.id, [...new Set([...buyerIds, ...sellerIds])]))
      : [];

    const relatedAccounts = accountIds.length > 0
      ? await db
          .select({
            id: accounts.id,
            title: accounts.title,
            coinsM: accounts.coinsM,
          })
          .from(accounts)
          .where(inArray(accounts.id, accountIds))
      : [];

    const userMap = new Map(
      relatedUsers.map((user) => [user.id, user.nickname || user.phone || '未知'])
    );
    const accountMap = new Map(
      relatedAccounts.map((account) => [account.id, account])
    );

    const formattedOrders = paginatedOrders.map((order) => {
      const account = accountMap.get(order.accountId);
      return {
        ...order,
        buyerName: userMap.get(order.buyerId) || '未知',
        sellerName: userMap.get(order.sellerId) || '未知',
        accountTitle: account?.title || '未知',
        coinsM: Number(account?.coinsM || 0),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      total: allOrders.length,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取订单列表失败' },
      { status: 500 }
    );
  }
}