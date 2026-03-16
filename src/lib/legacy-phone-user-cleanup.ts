import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import {
  accountDeposits,
  accounts,
  balanceTransactions,
  chatMessages,
  db,
  disputes,
  groupChatMembers,
  groupChats,
  orders,
  paymentRecords,
  splitRecords,
  userBalances,
  users,
  withdrawals,
} from '@/lib/db';

const PLATFORM_CUSTOMER_SERVICE_PHONE = 'platform_cs_user';

export interface LegacyPhoneCleanupCandidate {
  id: string;
  phone: string;
  nickname: string;
  createdAt: string | null;
}

export interface LegacyPhoneCleanupPreview {
  candidates: LegacyPhoneCleanupCandidate[];
  summary: {
    users: number;
    accounts: number;
    orders: number;
    groupChats: number;
    balanceRecords: number;
    withdrawalRecords: number;
    paymentRecords: number;
    splitRecords: number;
    disputes: number;
    accountDeposits: number;
  };
}

export interface LegacyPhoneCleanupResult extends LegacyPhoneCleanupPreview {
  deleted: LegacyPhoneCleanupPreview['summary'];
}

function buildLegacyPhoneOnlyUserCondition() {
  return and(
    ne(users.phone, PLATFORM_CUSTOMER_SERVICE_PHONE),
    ne(users.phone, ''),
    ne(users.phone, 'wx_'),
    isNull(users.wechatOpenid),
    isNull(users.wechatMpOpenid),
    isNull(users.wechatOpenPlatformOpenid),
  );
}

function isWechatPlaceholderPhone(phone: string | null | undefined) {
  return Boolean(phone && /^wx_[a-z0-9]+$/i.test(phone.trim()));
}

async function getCleanupPreview(): Promise<LegacyPhoneCleanupPreview & {
  userIds: string[];
  accountIds: string[];
  orderIds: string[];
  groupChatIds: string[];
}> {
  const candidateRows = await db
    .select({
      id: users.id,
      phone: users.phone,
      nickname: users.nickname,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(buildLegacyPhoneOnlyUserCondition());

  const candidates = candidateRows
    .filter((row) => row.phone && !isWechatPlaceholderPhone(row.phone))
    .map((row) => ({
      id: row.id,
      phone: row.phone,
      nickname: row.nickname || row.phone,
      createdAt: row.createdAt || null,
    }));

  const userIds = candidates.map((item) => item.id);
  if (userIds.length === 0) {
    return {
      candidates,
      userIds,
      accountIds: [],
      orderIds: [],
      groupChatIds: [],
      summary: {
        users: 0,
        accounts: 0,
        orders: 0,
        groupChats: 0,
        balanceRecords: 0,
        withdrawalRecords: 0,
        paymentRecords: 0,
        splitRecords: 0,
        disputes: 0,
        accountDeposits: 0,
      },
    };
  }

  const accountRows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(inArray(accounts.sellerId, userIds));
  const accountIds = accountRows.map((item) => item.id);

  const orderConditions = [
    inArray(orders.buyerId, userIds),
    inArray(orders.sellerId, userIds),
  ];

  if (accountIds.length > 0) {
    orderConditions.push(inArray(orders.accountId, accountIds));
  }

  const orderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(or(...orderConditions));
  const orderIds = orderRows.map((item) => item.id);

  const groupChatRows = orderIds.length > 0
    ? await db
        .select({ id: groupChats.id })
        .from(groupChats)
        .where(inArray(groupChats.orderId, orderIds))
    : [];
  const groupChatIds = groupChatRows.map((item) => item.id);

  const [
    balanceRecordRows,
    withdrawalRows,
    paymentRecordRows,
    splitRecordRows,
    disputeRows,
    accountDepositRows,
  ] = await Promise.all([
    db
      .select({ count: balanceTransactions.id })
      .from(balanceTransactions)
      .where(
        orderIds.length > 0
          ? or(
              inArray(balanceTransactions.userId, userIds),
              inArray(balanceTransactions.orderId, orderIds),
            )
          : inArray(balanceTransactions.userId, userIds),
      ),
    db
      .select({ count: withdrawals.id })
      .from(withdrawals)
      .where(inArray(withdrawals.userId, userIds)),
    db
      .select({ count: paymentRecords.id })
      .from(paymentRecords)
      .where(
        orderIds.length > 0
          ? or(
              inArray(paymentRecords.userId, userIds),
              inArray(paymentRecords.orderId, orderIds),
            )
          : inArray(paymentRecords.userId, userIds),
      ),
    orderIds.length > 0
      ? db
          .select({ count: splitRecords.id })
          .from(splitRecords)
          .where(inArray(splitRecords.orderId, orderIds))
      : Promise.resolve([]),
    orderIds.length > 0
      ? db
          .select({ count: disputes.id })
          .from(disputes)
          .where(
            or(
              inArray(disputes.orderId, orderIds),
              inArray(disputes.initiatorId, userIds),
              inArray(disputes.respondentId, userIds),
            ),
          )
      : db
          .select({ count: disputes.id })
          .from(disputes)
          .where(
            or(
              inArray(disputes.initiatorId, userIds),
              inArray(disputes.respondentId, userIds),
            ),
          ),
    accountIds.length > 0
      ? db
          .select({ count: accountDeposits.id })
          .from(accountDeposits)
          .where(
            or(
              inArray(accountDeposits.userId, userIds),
              inArray(accountDeposits.accountId, accountIds),
            ),
          )
      : db
          .select({ count: accountDeposits.id })
          .from(accountDeposits)
          .where(inArray(accountDeposits.userId, userIds)),
  ]);

  return {
    candidates,
    userIds,
    accountIds,
    orderIds,
    groupChatIds,
    summary: {
      users: userIds.length,
      accounts: accountIds.length,
      orders: orderIds.length,
      groupChats: groupChatIds.length,
      balanceRecords: balanceRecordRows.length,
      withdrawalRecords: withdrawalRows.length,
      paymentRecords: paymentRecordRows.length,
      splitRecords: splitRecordRows.length,
      disputes: disputeRows.length,
      accountDeposits: accountDepositRows.length,
    },
  };
}

export async function previewLegacyPhoneOnlyCleanup() {
  const preview = await getCleanupPreview();
  return {
    candidates: preview.candidates,
    summary: preview.summary,
  };
}

export async function executeLegacyPhoneOnlyCleanup(): Promise<LegacyPhoneCleanupResult> {
  const preview = await getCleanupPreview();

  if (preview.userIds.length === 0) {
    return {
      candidates: [],
      summary: preview.summary,
      deleted: preview.summary,
    };
  }

  await db.transaction(async (tx) => {
    if (preview.groupChatIds.length > 0) {
      await tx.delete(chatMessages).where(
        or(
          inArray(chatMessages.groupChatId, preview.groupChatIds),
          inArray(chatMessages.senderId, preview.userIds),
        ),
      );
      await tx.delete(groupChatMembers).where(
        or(
          inArray(groupChatMembers.groupChatId, preview.groupChatIds),
          inArray(groupChatMembers.userId, preview.userIds),
        ),
      );
      await tx.delete(groupChats).where(inArray(groupChats.id, preview.groupChatIds));
    }

    if (preview.orderIds.length > 0) {
      await tx.delete(splitRecords).where(inArray(splitRecords.orderId, preview.orderIds));
    }

    if (preview.orderIds.length > 0) {
      await tx.delete(paymentRecords).where(
        or(
          inArray(paymentRecords.userId, preview.userIds),
          inArray(paymentRecords.orderId, preview.orderIds),
        ),
      );
      await tx.delete(balanceTransactions).where(
        or(
          inArray(balanceTransactions.userId, preview.userIds),
          inArray(balanceTransactions.orderId, preview.orderIds),
        ),
      );
      await tx.delete(disputes).where(
        or(
          inArray(disputes.orderId, preview.orderIds),
          inArray(disputes.initiatorId, preview.userIds),
          inArray(disputes.respondentId, preview.userIds),
        ),
      );
    } else {
      await tx.delete(paymentRecords).where(inArray(paymentRecords.userId, preview.userIds));
      await tx.delete(balanceTransactions).where(inArray(balanceTransactions.userId, preview.userIds));
      await tx.delete(disputes).where(
        or(
          inArray(disputes.initiatorId, preview.userIds),
          inArray(disputes.respondentId, preview.userIds),
        ),
      );
    }

    await tx.delete(withdrawals).where(inArray(withdrawals.userId, preview.userIds));
    await tx.delete(userBalances).where(inArray(userBalances.userId, preview.userIds));

    if (preview.accountIds.length > 0) {
      await tx.delete(accountDeposits).where(
        or(
          inArray(accountDeposits.userId, preview.userIds),
          inArray(accountDeposits.accountId, preview.accountIds),
        ),
      );
    } else {
      await tx.delete(accountDeposits).where(inArray(accountDeposits.userId, preview.userIds));
    }

    if (preview.orderIds.length > 0) {
      await tx.delete(orders).where(inArray(orders.id, preview.orderIds));
    }

    if (preview.accountIds.length > 0) {
      await tx.delete(accounts).where(inArray(accounts.id, preview.accountIds));
    }

    await tx.delete(users).where(inArray(users.id, preview.userIds));
  });

  return {
    candidates: preview.candidates,
    summary: preview.summary,
    deleted: preview.summary,
  };
}
