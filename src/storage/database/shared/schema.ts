import { pgTable, index, foreignKey, uuid, varchar, text, boolean, timestamp, jsonb, numeric, unique, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: varchar({ length: 20 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	orderId: uuid("order_id"),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	readAt: timestamp("read_at", { mode: 'string' }),
}, (table) => [
	index("messages_is_read_idx").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "messages_order_id_orders_id_fk"
		}),
]);

export const disputes = pgTable("disputes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	initiatorId: uuid("initiator_id").notNull(),
	respondentId: uuid("respondent_id").notNull(),
	status: varchar({ length: 20 }).default('pending'),
	disputeType: varchar("dispute_type", { length: 50 }).notNull(),
	reason: text().notNull(),
	evidence: jsonb(),
	handlerId: uuid("handler_id"),
	resolution: text(),
	compensation: numeric({ precision: 10, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	index("disputes_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("disputes_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "disputes_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.initiatorId],
			foreignColumns: [users.id],
			name: "disputes_initiator_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.respondentId],
			foreignColumns: [users.id],
			name: "disputes_respondent_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.handlerId],
			foreignColumns: [users.id],
			name: "disputes_handler_id_users_id_fk"
	}),
]);

export const orderConsumptionSettlements = pgTable("order_consumption_settlements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	buyerId: uuid("buyer_id").notNull(),
	status: varchar({ length: 30 }).default('pending_buyer_confirmation').notNull(),
	pricingVersion: varchar("pricing_version", { length: 50 }).default('default-v1').notNull(),
	requestedAmount: numeric("requested_amount", { precision: 10, scale: 2 }).default('0').notNull(),
	approvedAmount: numeric("approved_amount", { precision: 10, scale: 2 }).default('0').notNull(),
	offlineSettledAmount: numeric("offline_settled_amount", { precision: 10, scale: 2 }).default('0').notNull(),
	depositDeductedAmount: numeric("deposit_deducted_amount", { precision: 10, scale: 2 }).default('0').notNull(),
	buyerRefundAmount: numeric("buyer_refund_amount", { precision: 10, scale: 2 }).default('0').notNull(),
	sellerRemark: text("seller_remark"),
	buyerRemark: text("buyer_remark"),
	evidence: jsonb(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow(),
	buyerConfirmedAt: timestamp("buyer_confirmed_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("order_consumption_settlements_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("order_consumption_settlements_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_consumption_settlements_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "order_consumption_settlements_seller_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [users.id],
			name: "order_consumption_settlements_buyer_id_users_id_fk"
		}),
]);

export const orderConsumptionSettlementItems = pgTable("order_consumption_settlement_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	settlementId: uuid("settlement_id").notNull(),
	itemName: varchar("item_name", { length: 100 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default('0').notNull(),
	unitLabel: varchar("unit_label", { length: 20 }).default('个').notNull(),
	quantity: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	subtotal: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	remark: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("order_consumption_settlement_items_settlement_id_idx").using("btree", table.settlementId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.settlementId],
			foreignColumns: [orderConsumptionSettlements.id],
			name: "order_consumption_settlement_items_settlement_id_fk"
		}).onDelete("cascade"),
]);

export const systemConfig = pgTable("system_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	configKey: varchar("config_key", { length: 50 }).notNull(),
	configValue: jsonb("config_value").notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("system_config_key_idx").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
	unique("system_config_config_key_unique").on(table.configKey),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	orderId: uuid("order_id"),
	type: varchar({ length: 20 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	balanceBefore: numeric("balance_before", { precision: 10, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 10, scale:  2 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("transactions_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("transactions_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "transactions_order_id_orders_id_fk"
		}),
]);

export const accountSnapshots = pgTable("account_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	accountInfo: jsonb("account_info").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "account_snapshots_order_id_orders_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	nickname: varchar({ length: 50 }).notNull(),
	avatar: varchar({ length: 500 }),
	email: varchar({ length: 100 }),
	userType: varchar("user_type", { length: 20 }).default('buyer'),
	sellerLevel: integer("seller_level").default(1),
	totalTrades: integer("total_trades").default(0),
	totalOrders: integer("total_orders").default(0),
	sellerRating: numeric("seller_rating", { precision: 3, scale:  2 }).default('5.00'),
	balance: numeric({ precision: 10, scale:  2 }).default('0.00'),
	frozenBalance: numeric("frozen_balance", { precision: 10, scale:  2 }).default('0.00'),
	isVerified: boolean("is_verified").default(false),
	realName: varchar("real_name", { length: 50 }),
	idCard: varchar("id_card", { length: 20 }),
	status: varchar({ length: 20 }).default('active'),
	isDeleted: boolean("is_deleted").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	wechatMpOpenid: varchar("wechat_mp_openid", { length: 100 }),
	wechatOpenPlatformOpenid: varchar("wechat_open_platform_openid", { length: 100 }),
	// 微信小程序登录相关字段
	wechatOpenid: varchar("wechat_openid", { length: 100 }),
	wechatUnionid: varchar("wechat_unionid", { length: 100 }),
	wechatNickname: varchar("wechat_nickname", { length: 100 }),
	wechatAvatar: varchar("wechat_avatar", { length: 500 }),
}, (table) => [
	index("users_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("users_seller_level_idx").using("btree", table.sellerLevel.asc().nullsLast().op("int4_ops")),
	unique("users_phone_unique").on(table.phone),
	unique("users_wechat_openid_unique").on(table.wechatOpenid),
	unique("users_wechat_mp_openid_unique").on(table.wechatMpOpenid),
	unique("users_wechat_open_platform_openid_unique").on(table.wechatOpenPlatformOpenid),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 32 }).notNull(),
	buyerId: uuid("buyer_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	accountId: uuid("account_id").notNull(),
	status: varchar({ length: 40 }).default('pending_payment'),
	rentalDuration: integer("rental_duration").notNull(),
	rentalPrice: numeric("rental_price", { precision: 10, scale:  2 }).notNull(),
	deposit: numeric({ precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	platformCommission: numeric("platform_commission", { precision: 10, scale:  2 }),
	withdrawalFee: numeric("withdrawal_fee", { precision: 10, scale:  2 }),
	sellerIncome: numeric("seller_income", { precision: 10, scale:  2 }),
	paymentMethod: varchar("payment_method", { length: 20 }),
	paymentTime: timestamp("payment_time", { mode: 'string' }),
	transactionId: varchar("transaction_id", { length: 100 }),
	qrcodeUrl: varchar("qrcode_url", { length: 500 }),
	qrcodeUploadedAt: timestamp("qrcode_uploaded_at", { mode: 'string' }),
	sellerConfirmedAt: timestamp("seller_confirmed_at", { mode: 'string' }),
	disputeId: uuid("dispute_id"),
	disputeReason: text("dispute_reason"),
	startTime: timestamp("start_time", { mode: 'string' }),
	endTime: timestamp("end_time", { mode: 'string' }),
	actualEndTime: timestamp("actual_end_time", { mode: 'string' }),
	buyerRating: integer("buyer_rating"),
	sellerRating: integer("seller_rating"),
	buyerComment: text("buyer_comment"),
	sellerComment: text("seller_comment"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	platformFee: numeric("platform_fee", { precision: 10, scale:  2 }),
	isSettled: boolean("is_settled").default(false),
	settledAt: timestamp("settled_at", { mode: 'string' }),
	verificationRequestTime: timestamp("verification_request_time", { mode: 'string' }),
	verificationDeadline: timestamp("verification_deadline", { mode: 'string' }),
	verificationResult: varchar("verification_result", { length: 20 }).default('pending'),
	verificationRemark: text("verification_remark"),
	disputeEvidence: jsonb("dispute_evidence"),
}, (table) => [
	index("orders_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("orders_buyer_id_idx").using("btree", table.buyerId.asc().nullsLast().op("uuid_ops")),
	index("orders_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("orders_seller_id_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [users.id],
			name: "orders_buyer_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "orders_seller_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "orders_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	unique("orders_order_no_unique").on(table.orderNo),
]);

export const userBalances = pgTable("user_balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	availableBalance: numeric("available_balance", { precision: 10, scale:  2 }).default('0'),
	nonWithdrawableBalance: numeric("non_withdrawable_balance", { precision: 10, scale:  2 }).default('0'),
	frozenBalance: numeric("frozen_balance", { precision: 10, scale:  2 }).default('0'),
	totalWithdrawn: numeric("total_withdrawn", { precision: 10, scale:  2 }).default('0'),
	totalEarned: numeric("total_earned", { precision: 10, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("user_balances_user_id_key").on(table.userId),
]);

export const paymentRecords = pgTable("payment_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 36 }).notNull(),
	orderNo: varchar("order_no", { length: 32 }).notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	method: varchar({ length: 20 }).notNull(),
	transactionId: varchar("transaction_id", { length: 64 }),
	thirdPartyOrderId: varchar("third_party_order_id", { length: 64 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const splitRecords = pgTable("split_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 36 }).notNull(),
	orderNo: varchar("order_no", { length: 32 }).notNull(),
	receiverType: varchar("receiver_type", { length: 20 }).notNull(),
	receiverId: varchar("receiver_id", { length: 36 }).notNull(),
	receiverName: varchar("receiver_name", { length: 100 }),
	splitAmount: numeric("split_amount", { precision: 10, scale:  2 }).notNull(),
	splitRatio: numeric("split_ratio", { precision: 5, scale:  2 }).notNull(),
	commissionType: varchar("commission_type", { length: 50 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	failureReason: text("failure_reason"),
	splitTime: timestamp("split_time", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const balanceTransactions = pgTable("balance_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	orderId: varchar("order_id", { length: 36 }),
	withdrawalId: varchar("withdrawal_id", { length: 36 }),
	transactionType: varchar("transaction_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	balanceBefore: numeric("balance_before", { precision: 10, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 10, scale:  2 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const financeAuditLogs = pgTable("finance_audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('success').notNull(),
	userId: varchar("user_id", { length: 36 }),
	orderId: varchar("order_id", { length: 36 }),
	paymentRecordId: varchar("payment_record_id", { length: 36 }),
	withdrawalId: varchar("withdrawal_id", { length: 36 }),
	accountId: varchar("account_id", { length: 36 }),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: varchar({ length: 10 }).default('CNY').notNull(),
	balanceBefore: numeric("balance_before", { precision: 10, scale:  2 }),
	balanceAfter: numeric("balance_after", { precision: 10, scale:  2 }),
	details: jsonb(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("finance_audit_logs_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("finance_audit_logs_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
	index("finance_audit_logs_payment_record_id_idx").using("btree", table.paymentRecordId.asc().nullsLast().op("text_ops")),
	index("finance_audit_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("finance_audit_logs_withdrawal_id_idx").using("btree", table.withdrawalId.asc().nullsLast().op("text_ops")),
]);

export const accountDeposits = pgTable("account_deposits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('frozen'),
	refundReason: varchar("refund_reason", { length: 50 }),
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("account_deposits_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("account_deposits_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("account_deposits_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "account_deposits_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_deposits_user_id_users_id_fk"
		}),
]);

export const accountEditHistory = pgTable("account_edit_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	oldData: jsonb("old_data").notNull(),
	newData: jsonb("new_data").notNull(),
	changeType: varchar("change_type", { length: 20 }).notNull(),
	changedFields: jsonb("changed_fields").default([]),
	reason: text(),
	ipAddress: varchar("ip_address", { length: 50 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_account_edit_history_account_id").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("idx_account_edit_history_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_account_edit_history_seller_id").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "account_edit_history_account_id_fkey"
		}).onDelete("cascade"),
]);

export const withdrawals = pgTable("withdrawals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	withdrawalNo: varchar("withdrawal_no", { length: 32 }).notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	username: varchar({ length: 100 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	withdrawalFee: numeric("withdrawal_fee", { precision: 10, scale:  2 }).notNull(),
	feeAmount: numeric("fee_amount", { precision: 10, scale:  2 }).notNull(),
	actualAmount: numeric("actual_amount", { precision: 10, scale:  2 }).notNull(),
	withdrawalType: varchar("withdrawal_type", { length: 20 }).notNull(),
	accountInfo: jsonb("account_info").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reviewerId: varchar("reviewer_id", { length: 36 }),
	reviewTime: timestamp("review_time", { mode: 'string' }),
	reviewRemark: text("review_remark"),
	thirdPartyTransactionId: varchar("third_party_transaction_id", { length: 64 }),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("withdrawals_withdrawal_no_key").on(table.withdrawalNo),
]);

export const smsConfigs = pgTable("sms_configs", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	provider: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 50 }).notNull(),
	apiKey: varchar("api_key", { length: 200 }).default(''),
	apiSecret: varchar("api_secret", { length: 200 }).default(''),
	signName: varchar("sign_name", { length: 50 }).default(''),
	endpoint: varchar({ length: 200 }).default(''),
	enabled: boolean().default(false),
	defaultTemplate: varchar("default_template", { length: 100 }).default(''),
	maxDailyCount: integer("max_daily_count").default(10000),
	currentCount: integer("current_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("sms_configs_provider_key").on(table.provider),
]);

export const smsRecords = pgTable("sms_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	provider: varchar({ length: 20 }).notNull(),
	phone: varchar({ length: 11 }).notNull(),
	code: varchar({ length: 6 }).default(''),
	templateCode: varchar("template_code", { length: 100 }).default(''),
	status: varchar({ length: 20 }).notNull(),
	message: text(),
	requestId: varchar("request_id", { length: 100 }),
	bizId: varchar("biz_id", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("sms_records_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("sms_records_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("sms_records_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const admins = pgTable("admins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 100 }),
	name: varchar({ length: 50 }),
	role: varchar({ length: 20 }).default('admin'),
	status: varchar({ length: 20 }).default('active'),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("admins_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("admins_username_key").on(table.username),
]);

export const verificationApplications = pgTable("verification_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	realName: varchar("real_name", { length: 50 }).notNull(),
	idCard: varchar("id_card", { length: 20 }).notNull(),
	idCardFrontUrl: varchar("id_card_front_url", { length: 500 }).notNull(),
	idCardBackUrl: varchar("id_card_back_url", { length: 500 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reviewedBy: varchar("reviewed_by", { length: 100 }),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewComment: text("review_comment"),
	verificationService: varchar("verification_service", { length: 20 }).default('manual'),
	verificationResult: jsonb("verification_result"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("verification_applications_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("verification_applications_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "verification_applications_user_id_fkey"
		}).onDelete("cascade"),
]);

export const platformSettings = pgTable("platform_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }).default('5.00').notNull(),
	minCommission: numeric("min_commission", { precision: 10, scale:  2 }).default('0.00').notNull(),
	maxCommission: numeric("max_commission", { precision: 10, scale:  2 }).default('100.00').notNull(),
	withdrawalFee: numeric("withdrawal_fee", { precision: 5, scale:  2 }).default('1.00').notNull(),
	minRentalPrice: numeric("min_rental_price", { precision: 10, scale:  2 }).default('50.00').notNull(),
	depositRatio: numeric("deposit_ratio", { precision: 5, scale:  2 }).default('50.00').notNull(),
	coinsPerDay: numeric("coins_per_day", { precision: 10, scale:  2 }).default('10.00').notNull(),
	minRentalHours: integer("min_rental_hours").default(24).notNull(),
	maxCoinsPerAccount: numeric("max_coins_per_account", { precision: 10, scale:  2 }).default('1000.00').notNull(),
	maxDeposit: numeric("max_deposit", { precision: 10, scale:  2 }).default('10000.00').notNull(),
	requireManualReview: boolean("require_manual_review").default(true).notNull(),
	autoApproveVerified: boolean("auto_approve_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	listingDepositAmount: numeric("listing_deposit_amount", { precision: 10, scale:  2 }).default('50.00'),
	orderPaymentTimeout: integer("order_payment_timeout").default(180),
	wechatMpAppId: varchar("wechat_mp_app_id", { length: 100 }),
	wechatMpAppSecret: varchar("wechat_mp_app_secret", { length: 100 }),
	wechatOpenAppId: varchar("wechat_open_app_id", { length: 100 }),
	wechatOpenAppSecret: varchar("wechat_open_app_secret", { length: 100 }),
	wechatToken: varchar("wechat_token", { length: 100 }),
	wechatEncodingAESKey: varchar("wechat_encoding_aes_key", { length: 100 }),
});

export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sellerId: uuid("seller_id").notNull(),
	accountId: varchar("account_id", { length: 50 }).notNull(),
	title: varchar({ length: 100 }).notNull(),
	description: text(),
	screenshots: jsonb(),
	coinsM: numeric("coins_m", { precision: 10, scale:  2 }).notNull(),
	safeboxCount: integer("safebox_count").default(0),
	energyValue: integer("energy_value").default(0),
	staminaValue: integer("stamina_value").default(0),
	hasSkins: boolean("has_skins").default(false),
	skinTier: varchar("skin_tier", { length: 20 }),
	skinCount: integer("skin_count").default(0),
	hasBattlepass: boolean("has_battlepass").default(false),
	battlepassLevel: integer("battlepass_level").default(0),
	customAttributes: jsonb("custom_attributes").default({}),
	tags: jsonb().default([]),
	accountValue: numeric("account_value", { precision: 10, scale:  2 }),
	recommendedRental: numeric("recommended_rental", { precision: 10, scale:  2 }),
	rentalRatio: numeric("rental_ratio", { precision: 10, scale:  2 }),
	deposit: numeric({ precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }),
	rentalDays: numeric("rental_days", { precision: 10, scale:  2 }),
	rentalHours: numeric("rental_hours", { precision: 10, scale:  2 }),
	rentalDescription: varchar("rental_description", { length: 50 }),
	viewCount: integer("view_count").default(0),
	tradeCount: integer("trade_count").default(0),
	status: varchar({ length: 20 }).default('available'),
	isDeleted: boolean("is_deleted").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	listedAt: timestamp("listed_at", { mode: 'string' }),
	auditStatus: varchar("audit_status", { length: 20 }).default('pending'),
	auditReason: text("audit_reason"),
	auditUserId: uuid("audit_user_id"),
	auditTime: timestamp("audit_time", { mode: 'string' }),
	depositId: uuid("deposit_id"),
	username: varchar({ length: 100 }),
	password: varchar({ length: 200 }),
}, (table) => [
	index("accounts_coins_m_idx").using("btree", table.coinsM.asc().nullsLast().op("numeric_ops")),
	index("accounts_price_idx").using("btree", table.recommendedRental.asc().nullsLast().op("numeric_ops")),
	index("accounts_seller_id_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	index("accounts_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "accounts_seller_id_users_id_fk"
		}).onDelete("cascade"),
	unique("accounts_account_id_unique").on(table.accountId),
]);

export const platformConfig = pgTable("platform_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	configKey: varchar("config_key", { length: 50 }).notNull(),
	configValue: text("config_value").notNull(),
	configType: varchar("config_type", { length: 20 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("platform_config_config_key_key").on(table.configKey),
]);

export const commissionActivities = pgTable("commission_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	discountRate: numeric("discount_rate", { precision: 5, scale:  2 }).default('0.00').notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	enabled: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_commission_activities_enabled").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("idx_commission_activities_time").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops"), table.endTime.asc().nullsLast().op("timestamp_ops")),
]);

export const agreements = pgTable("agreements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 100 }).notNull(),
	content: text().notNull(),
	enabled: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("agreements_key_key").on(table.key),
]);

export const paymentConfigs = pgTable("payment_configs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	configType: varchar("config_type", { length: 20 }).notNull(),
	configKey: varchar("config_key", { length: 50 }).notNull(),
	configValue: text("config_value").notNull(),
	isEncrypted: boolean("is_encrypted").default(true).notNull(),
	description: text(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("payment_configs_key_idx").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
	index("payment_configs_type_idx").using("btree", table.configType.asc().nullsLast().op("text_ops")),
	unique("payment_configs_type_key_unique").on(table.configType, table.configKey),
]);

export const wecomCustomerService = pgTable("wecom_customer_service", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	corpId: varchar("corp_id", { length: 50 }).notNull(),
	agentId: varchar("agent_id", { length: 20 }).notNull(),
	secret: text().notNull(),
	token: varchar({ length: 100 }),
	encodingAesKey: varchar("encoding_aes_key", { length: 100 }),
	kfId: varchar("kf_id", { length: 50 }),
	kfName: varchar("kf_name", { length: 100 }),
	kfAvatar: varchar("kf_avatar", { length: 500 }),
	kfQrCode: varchar("kf_qr_code", { length: 500 }),
	autoReply: boolean("auto_reply").default(true).notNull(),
	welcomeMessage: text("welcome_message").notNull(),
	offlineMessage: text("offline_message").notNull(),
	busyMessage: text("busy_message").notNull(),
	showOnHomepage: boolean("show_on_homepage").default(true).notNull(),
	showOnOrderPage: boolean("show_on_order_page").default(true).notNull(),
	showOnSellerPage: boolean("show_on_seller_page").default(true).notNull(),
	floatingButtonEnabled: boolean("floating_button_enabled").default(true).notNull(),
	floatingButtonPosition: varchar("floating_button_position", { length: 10 }).default('right').notNull(),
	floatingButtonColor: varchar("floating_button_color", { length: 20 }).default('#07C160').notNull(),
	status: varchar({ length: 20 }).default('online').notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	kfUrl: varchar("kf_url", { length: 500 }),
});

export const groupChats = pgTable("group_chats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("group_chats_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "group_chats_order_id_fkey"
		}).onDelete("cascade"),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupChatId: uuid("group_chat_id").notNull(),
	senderId: uuid("sender_id").notNull(),
	senderType: varchar("sender_type", { length: 20 }).notNull(),
	content: text().notNull(),
	messageType: varchar("message_type", { length: 20 }).default('text'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("chat_messages_group_chat_id_idx").using("btree", table.groupChatId.asc().nullsLast().op("uuid_ops")),
	index("chat_messages_sender_id_idx").using("btree", table.senderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupChatId],
			foreignColumns: [groupChats.id],
			name: "chat_messages_group_chat_id_fkey"
		}).onDelete("cascade"),
]);

export const groupChatMembers = pgTable("group_chat_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupChatId: uuid("group_chat_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("group_chat_members_group_chat_id_idx").using("btree", table.groupChatId.asc().nullsLast().op("uuid_ops")),
	index("group_chat_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupChatId],
			foreignColumns: [groupChats.id],
			name: "group_chat_members_group_chat_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_chat_members_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_chat_members_group_chat_id_user_id_key").on(table.groupChatId, table.userId),
]);
