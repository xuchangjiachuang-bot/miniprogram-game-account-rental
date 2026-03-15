import { pgTable, index, foreignKey, unique, uuid, varchar, text, jsonb, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



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
	rentalRatio: numeric("rental_ratio", { precision: 5, scale:  4 }),
	deposit: numeric({ precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }),
	rentalDays: numeric("rental_days", { precision: 10, scale:  2 }),
	rentalHours: numeric("rental_hours", { precision: 10, scale:  2 }),
	rentalDescription: varchar("rental_description", { length: 50 }),
	viewCount: integer("view_count").default(0),
	tradeCount: integer("trade_count").default(0),
	status: varchar({ length: 20 }).default('available'),
	auditStatus: varchar("audit_status", { length: 20 }).default('pending'), // 新增：审核状态
	auditReason: text("audit_reason"), // 新增：审核原因
	auditUserId: uuid("audit_user_id"), // 新增：审核人
	auditTime: timestamp("audit_time", { mode: 'string' }), // 新增：审核时间
	depositId: uuid("deposit_id"), // 新增：保证金记录ID
	isDeleted: boolean("is_deleted").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	listedAt: timestamp("listed_at", { mode: 'string' }),
}, (table) => [
	index("accounts_coins_m_idx").using("btree", table.coinsM.asc().nullsLast().op("numeric_ops")),
	index("accounts_price_idx").using("btree", table.recommendedRental.asc().nullsLast().op("numeric_ops")),
	index("accounts_seller_id_idx").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	index("accounts_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("accounts_audit_status_idx").using("btree", table.auditStatus.asc().nullsLast().op("text_ops")), // 新增：审核状态索引
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "accounts_seller_id_users_id_fk"
		}).onDelete("cascade"),
	unique("accounts_account_id_unique").on(table.accountId),
]);

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

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 32 }).notNull(),
	buyerId: uuid("buyer_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	accountId: uuid("account_id").notNull(),
	status: varchar({ length: 20 }).default('pending_payment'),
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
	isVerified: boolean("is_verified").default(false),
	realName: varchar("real_name", { length: 50 }),
	idCard: varchar("id_card", { length: 20 }),
	status: varchar({ length: 20 }).default('active'),
	isDeleted: boolean("is_deleted").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	wechatOpenid: varchar("wechat_openid", { length: 100 }),
	wechatMpOpenid: varchar("wechat_mp_openid", { length: 100 }),
	wechatOpenPlatformOpenid: varchar("wechat_open_platform_openid", { length: 100 }),
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

export const userBalances = pgTable("user_balances", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
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
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
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
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
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
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
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

export const withdrawals = pgTable("withdrawals", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
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

export const platformConfig = pgTable("platform_config", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	configKey: varchar("config_key", { length: 50 }).notNull(),
	configValue: text("config_value").notNull(),
	configType: varchar("config_type", { length: 20 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("platform_config_config_key_key").on(table.configKey),
]);

export const smsConfigs = pgTable("sms_configs", {
	id: varchar("id", { length: 50 }).primaryKey().notNull(),
	provider: varchar("provider", { length: 20 }).notNull(),
	name: varchar("name", { length: 50 }).notNull(),
	apiKey: varchar("api_key", { length: 200 }).default(''),
	apiSecret: varchar("api_secret", { length: 200 }).default(''),
	signName: varchar("sign_name", { length: 50 }).default(''),
	endpoint: varchar("endpoint", { length: 200 }).default(''),
	enabled: boolean("enabled").default(false),
	defaultTemplate: varchar("default_template", { length: 100 }).default(''),
	maxDailyCount: integer("max_daily_count").default(10000),
	currentCount: integer("current_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("sms_configs_id_key").on(table.id),
	unique("sms_configs_provider_key").on(table.provider),
]);

export const smsRecords = pgTable("sms_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	provider: varchar("provider", { length: 20 }).notNull(),
	phone: varchar("phone", { length: 11 }).notNull(),
	code: varchar("code", { length: 6 }).default(''),
	templateCode: varchar("template_code", { length: 100 }).default(''),
	status: varchar("status", { length: 20 }).notNull(),
	message: text(),
	requestId: varchar("request_id", { length: 100 }),
	bizId: varchar("biz_id", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("sms_records_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("sms_records_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("sms_records_created_at_idx").using("btree", table.createdAt.desc().nullsLast().op("timestamp_ops")),
]);

export const platformSettings = pgTable("platform_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default('5'),
	minCommission: numeric("min_commission", { precision: 10, scale: 2 }).default('0'),
	maxCommission: numeric("max_commission", { precision: 10, scale: 2 }).default('100'),
	withdrawalFee: numeric("withdrawal_fee", { precision: 5, scale: 2 }).default('1'),
	minRentalPrice: numeric("min_rental_price", { precision: 10, scale: 2 }).default('50'),
	depositRatio: numeric("deposit_ratio", { precision: 5, scale: 2 }).default('50'),
	coinsPerDay: numeric("coins_per_day", { precision: 5, scale: 1 }).default('10'),
	minRentalHours: integer("min_rental_hours").default(24),
	maxCoinsPerAccount: numeric("max_coins_per_account", { precision: 10, scale: 1 }).default('1000'),
	maxDeposit: numeric("max_deposit", { precision: 10, scale: 2 }).default('10000'),
	requireManualReview: boolean("require_manual_review").default(true),
	autoApproveVerified: boolean("auto_approve_verified").default(false),
	listingDepositAmount: numeric("listing_deposit_amount", { precision: 10, scale: 2 }).default('50'), // 新增：上架保证金金额
	orderPaymentTimeout: integer("order_payment_timeout").default(1800), // 新增：订单支付超时时间（秒），默认30分钟
	wechatMpAppId: varchar("wechat_mp_app_id", { length: 100 }), // 公众号 AppID
	wechatMpAppSecret: varchar("wechat_mp_app_secret", { length: 100 }), // 公众号 AppSecret
	wechatOpenAppId: varchar("wechat_open_app_id", { length: 100 }), // 开放平台 AppID
	wechatOpenAppSecret: varchar("wechat_open_app_secret", { length: 100 }), // 开放平台 AppSecret
	wechatToken: varchar("wechat_token", { length: 100 }), // 微信 Token
	wechatEncodingAESKey: varchar("wechat_encoding_aes_key", { length: 100 }), // 微信 EncodingAESKey
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("platform_settings_id_key").on(table.id),
]);

export const commissionActivities = pgTable("commission_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description").default(''),
	discountRate: numeric("discount_rate", { precision: 5, scale: 2 }).default('0'),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	enabled: boolean("enabled").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("commission_activities_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("commission_activities_start_time_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("commission_activities_end_time_idx").using("btree", table.endTime.asc().nullsLast().op("timestamp_ops")),
]);

// 新增：群聊组表
export const chatGroups = pgTable("chat_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupName: varchar("group_name", { length: 100 }).notNull(),
	groupType: varchar("group_type", { length: 20 }).default('order'), // order, platform, custom
	relatedOrderId: uuid("related_order_id"), // 关联的订单ID
	relatedPlatformId: uuid("related_platform_id"), // 关联的平台ID
	creatorId: uuid("creator_id").notNull(),
	maxMembers: integer("max_members").default(10),
	avatar: varchar("avatar", { length: 500 }),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("chat_groups_group_type_idx").using("btree", table.groupType.asc().nullsLast().op("text_ops")),
	index("chat_groups_related_order_id_idx").using("btree", table.relatedOrderId.asc().nullsLast().op("uuid_ops")),
	index("chat_groups_creator_id_idx").using("btree", table.creatorId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "chat_groups_creator_id_users_id_fk"
		}),
]);

// 新增：群聊成员表
export const chatGroupMembers = pgTable("chat_group_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar("role", { length: 20 }).default('member'), // owner, admin, member
	joinTime: timestamp("join_time", { mode: 'string' }).defaultNow(),
	mutedUntil: timestamp("muted_until", { mode: 'string' }),
}, (table) => [
	index("chat_group_members_group_id_idx").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("chat_group_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [chatGroups.id],
			name: "chat_group_members_group_id_chat_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_group_members_user_id_users_id_fk"
		}),
	unique("chat_group_members_group_id_user_id_unique").on(table.groupId, table.userId),
]);

// 新增：群聊消息表
export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	messageType: varchar("message_type", { length: 20 }).default('text'), // text, image, file, system
	content: text(),
	attachments: jsonb(),
	replyTo: uuid("reply_to"),
	isDeleted: boolean("is_deleted").default(false),
	deletedBy: uuid("deleted_by"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("chat_messages_group_id_idx").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("chat_messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("chat_messages_created_at_idx").using("btree", table.createdAt.desc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [chatGroups.id],
			name: "chat_messages_group_id_chat_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_messages_user_id_users_id_fk"
		}),
]);

// 新增：账号保证金记录表
export const accountDeposits = pgTable("account_deposits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	status: varchar("status", { length: 20 }).default('frozen'), // frozen, released, confiscated
	refundReason: varchar("refund_reason", { length: 50 }), // cancelled, completed, other
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("account_deposits_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("account_deposits_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("account_deposits_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
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

// 实名认证申请表（人工审核）
export const verificationApplications = pgTable("verification_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	realName: varchar("real_name", { length: 50 }).notNull(),
	idCard: varchar("id_card", { length: 20 }).notNull(),
	idCardFrontUrl: varchar("id_card_front_url", { length: 500 }).notNull(),
	idCardBackUrl: varchar("id_card_back_url", { length: 500 }).notNull(),
	status: varchar("status", { length: 20 }).default('pending').notNull(), // pending, approved, rejected
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewComment: text("review_comment"),
	verificationService: varchar("verification_service", { length: 20 }).default('manual'), // manual, aliyun, tencent
	verificationResult: jsonb("verification_result"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("verification_applications_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("verification_applications_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "verification_applications_user_id_users_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.reviewedBy],
		foreignColumns: [users.id],
		name: "verification_applications_reviewed_by_users_id_fk"
	}),
]);
