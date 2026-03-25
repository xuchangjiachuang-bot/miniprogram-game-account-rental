import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { accounts, db } from '@/lib/db';
import { submitForAudit } from '@/lib/account-audit-service';
import { refundListingDepositIfFrozen } from '@/lib/account-deposit-service';
import { requireAdmin } from '@/lib/admin-auth';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

const SKIN_RANKS = ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '王者'] as const;

async function resolveRequestIdentity(request: NextRequest) {
  const adminAuth = await requireAdmin(request);
  if (!adminAuth.error) {
    return { isAdmin: true, user: null };
  }

  const token = getServerToken(request);
  const user = token ? await verifyToken(token) : null;
  return { isAdmin: false, user };
}

async function findAccountByIdOrAccountId(id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    const byId = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (byId[0]) {
      return byId[0];
    }
  }

  const byAccountId = await db.select().from(accounts).where(eq(accounts.accountId, id)).limit(1);
  return byAccountId[0] || null;
}

function normalizeSkinTier(rawSkinTier: string | null | undefined, tags?: string[]) {
  const candidates = [
    ...(rawSkinTier ? rawSkinTier.split(',') : []),
    ...(tags || []),
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  const matchedRank = candidates.find((item) =>
    SKIN_RANKS.includes(item as (typeof SKIN_RANKS)[number]),
  );

  if (matchedRank) {
    return matchedRank;
  }

  if (candidates.length > 0) {
    return '精选皮肤';
  }

  return null;
}

function generateAccountTitle(data: {
  coinsM: number;
  safeboxCount: number;
  energyValue: number;
  staminaValue: number;
  hasSkins: boolean;
  skinTier?: string | null;
  skinCount: number;
  hasBattlepass: boolean;
  battlepassLevel: number;
}) {
  const parts: string[] = [];
  parts.push(`哈夫币 ${data.coinsM}M`);

  const safeboxType = data.safeboxCount === 4 ? '2x2' : data.safeboxCount === 6 ? '2x3' : '3x3';
  const safeboxLabel = data.safeboxCount === 9 ? '顶级保险箱' : `${data.safeboxCount}格保险箱`;
  parts.push(`${safeboxLabel}(${safeboxType})`);
  parts.push(`${data.staminaValue}体力`);
  parts.push(`${data.energyValue}负重`);

  if (data.hasSkins && data.skinTier) {
    parts.push(data.skinTier);
    if (data.skinCount > 0) {
      parts.push(`${data.skinCount}个皮肤`);
    }
  }

  if (data.hasBattlepass) {
    parts.push(`BP${data.battlepassLevel}级`);
  }

  const title = `${parts.join('  |  ')}  |  `;
  return title.length <= 100 ? title : `${title.slice(0, 97).trimEnd()}...`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await resolveRequestIdentity(request);
    const account = await findAccountByIdOrAccountId(id);

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
    }

    const isPublicAccount =
      account.auditStatus === 'approved' &&
      account.status === 'available' &&
      !account.isDeleted;

    if (!isPublicAccount && !identity.isAdmin && identity.user?.id !== account.sellerId) {
      return NextResponse.json({ success: false, error: '无权查看该账号' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    console.error('获取账号详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取账号详情失败' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await resolveRequestIdentity(request);

    if (!identity.isAdmin && !identity.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.coinsM && !body.coins_value) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：哈夫币数量' },
        { status: 400 },
      );
    }

    const existingAccount = await findAccountByIdOrAccountId(id);
    if (!existingAccount) {
      return NextResponse.json({ success: false, error: `账号不存在，ID: ${id}` }, { status: 404 });
    }

    if (!identity.isAdmin && identity.user?.id !== existingAccount.sellerId) {
      return NextResponse.json({ success: false, error: '无权修改该账号' }, { status: 403 });
    }

    if (['rented', 'sold'].includes(existingAccount.status || '')) {
      return NextResponse.json(
        { success: false, error: '账号正在交易中，暂不支持编辑' },
        { status: 400 },
      );
    }

    if ((existingAccount.tradeCount || 0) > 0) {
      return NextResponse.json(
        { success: false, error: '账号已有交易记录，不能再修改' },
        { status: 400 },
      );
    }

    const normalizedSkinTier = normalizeSkinTier(body.skinTier || null, body.tags || []);
    const autoGeneratedTitle = generateAccountTitle({
      coinsM: Number(body.coinsM || body.coins_value || 0),
      safeboxCount: Number(body.safeboxCount || 0),
      energyValue: Number(body.energyValue || 0),
      staminaValue: Number(body.staminaValue || 0),
      hasSkins: Boolean(body.hasSkins),
      skinTier: normalizedSkinTier,
      skinCount: Number(body.skinCount || 0),
      hasBattlepass: Boolean(body.hasBattlepass),
      battlepassLevel: Number(body.battlepassLevel || 0),
    });

    try {
      const { accountEditHistory } = await import('@/lib/db');
      await db.insert(accountEditHistory).values({
        accountId: existingAccount.id,
        sellerId: existingAccount.sellerId,
        oldData: existingAccount,
        newData: body,
        changeType: 'update',
        changedFields: [],
        reason: body.editReason || null,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      });
    } catch (historyError) {
      console.error('保存账号编辑历史失败:', historyError);
    }

    const [updatedAccount] = await db
      .update(accounts)
      .set({
        title: autoGeneratedTitle,
        description: body.description || null,
        screenshots: body.screenshots || null,
        coinsM: String(body.coinsM || body.coins_value || 0),
        safeboxCount: Number(body.safeboxCount || 0),
        energyValue: Number(body.energyValue || 0),
        staminaValue: Number(body.staminaValue || 0),
        hasSkins: Boolean(body.hasSkins),
        skinTier: normalizedSkinTier,
        skinCount: Number(body.skinCount || 0),
        hasBattlepass: Boolean(body.hasBattlepass),
        battlepassLevel: Number(body.battlepassLevel || 0),
        customAttributes: body.customAttributes || {},
        tags: body.tags || [],
        accountValue: body.accountValue ? String(body.accountValue) : null,
        recommendedRental: body.recommendedRental ? String(body.recommendedRental) : null,
        rentalRatio: body.rentalRatio ? String(body.rentalRatio) : null,
        deposit: String(body.deposit || 0),
        totalPrice: body.totalPrice ? String(body.totalPrice) : null,
        rentalDays: body.rentalDays ? String(body.rentalDays) : null,
        rentalHours: body.rentalHours ? String(body.rentalHours) : null,
        rentalDescription: body.rentalDescription || null,
        auditStatus: 'pending',
        status: 'draft',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, existingAccount.id))
      .returning();

    if (!updatedAccount) {
      return NextResponse.json({ success: false, error: '更新账号失败' }, { status: 500 });
    }

    const auditResult = await submitForAudit(existingAccount.id);

    return NextResponse.json({
      success: true,
      message: '账号修改成功，已重新提交审核',
      data: {
        account: updatedAccount,
        auditDetails: auditResult,
      },
    });
  } catch (error: any) {
    console.error('更新账号失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新账号失败' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await resolveRequestIdentity(request);

    if (!identity.isAdmin && !identity.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const existingAccount = await findAccountByIdOrAccountId(id);
    if (!existingAccount) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
    }

    if (!identity.isAdmin && identity.user?.id !== existingAccount.sellerId) {
      return NextResponse.json({ success: false, error: '无权下架该账号' }, { status: 403 });
    }

    if (['rented', 'sold'].includes(existingAccount.status || '')) {
      return NextResponse.json(
        { success: false, error: '账号正在交易中或已售出，无法下架' },
        { status: 400 },
      );
    }

    const depositRefundResult = await refundListingDepositIfFrozen(existingAccount.id, 'cancelled');
    if (!depositRefundResult.success) {
      return NextResponse.json(
        { success: false, error: depositRefundResult.message || '下架账号时退还保证金失败' },
        { status: 500 },
      );
    }

    await db
      .update(accounts)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, existingAccount.id));

    return NextResponse.json({ success: true, message: '账号已下架归档，历史记录已保留' });
  } catch (error: any) {
    console.error('下架账号失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '下架账号失败' },
      { status: 500 },
    );
  }
}
