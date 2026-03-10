import { relations } from "drizzle-orm/relations";
import { users, messages, orders, disputes, transactions, accountSnapshots, accounts, accountDeposits, accountEditHistory, verificationApplications, groupChats, chatMessages, groupChatMembers } from "./schema";

export const messagesRelations = relations(messages, ({one}) => ({
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
	order: one(orders, {
		fields: [messages.orderId],
		references: [orders.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	messages: many(messages),
	disputes_initiatorId: many(disputes, {
		relationName: "disputes_initiatorId_users_id"
	}),
	disputes_respondentId: many(disputes, {
		relationName: "disputes_respondentId_users_id"
	}),
	disputes_handlerId: many(disputes, {
		relationName: "disputes_handlerId_users_id"
	}),
	transactions: many(transactions),
	orders_buyerId: many(orders, {
		relationName: "orders_buyerId_users_id"
	}),
	orders_sellerId: many(orders, {
		relationName: "orders_sellerId_users_id"
	}),
	accountDeposits: many(accountDeposits),
	verificationApplications: many(verificationApplications),
	accounts: many(accounts),
	groupChatMembers: many(groupChatMembers),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	messages: many(messages),
	disputes: many(disputes),
	transactions: many(transactions),
	accountSnapshots: many(accountSnapshots),
	user_buyerId: one(users, {
		fields: [orders.buyerId],
		references: [users.id],
		relationName: "orders_buyerId_users_id"
	}),
	user_sellerId: one(users, {
		fields: [orders.sellerId],
		references: [users.id],
		relationName: "orders_sellerId_users_id"
	}),
	account: one(accounts, {
		fields: [orders.accountId],
		references: [accounts.id]
	}),
	groupChats: many(groupChats),
}));

export const disputesRelations = relations(disputes, ({one}) => ({
	order: one(orders, {
		fields: [disputes.orderId],
		references: [orders.id]
	}),
	user_initiatorId: one(users, {
		fields: [disputes.initiatorId],
		references: [users.id],
		relationName: "disputes_initiatorId_users_id"
	}),
	user_respondentId: one(users, {
		fields: [disputes.respondentId],
		references: [users.id],
		relationName: "disputes_respondentId_users_id"
	}),
	user_handlerId: one(users, {
		fields: [disputes.handlerId],
		references: [users.id],
		relationName: "disputes_handlerId_users_id"
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	order: one(orders, {
		fields: [transactions.orderId],
		references: [orders.id]
	}),
}));

export const accountSnapshotsRelations = relations(accountSnapshots, ({one}) => ({
	order: one(orders, {
		fields: [accountSnapshots.orderId],
		references: [orders.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one, many}) => ({
	orders: many(orders),
	accountDeposits: many(accountDeposits),
	accountEditHistories: many(accountEditHistory),
	user: one(users, {
		fields: [accounts.sellerId],
		references: [users.id]
	}),
}));

export const accountDepositsRelations = relations(accountDeposits, ({one}) => ({
	account: one(accounts, {
		fields: [accountDeposits.accountId],
		references: [accounts.id]
	}),
	user: one(users, {
		fields: [accountDeposits.userId],
		references: [users.id]
	}),
}));

export const accountEditHistoryRelations = relations(accountEditHistory, ({one}) => ({
	account: one(accounts, {
		fields: [accountEditHistory.accountId],
		references: [accounts.id]
	}),
}));

export const verificationApplicationsRelations = relations(verificationApplications, ({one}) => ({
	user: one(users, {
		fields: [verificationApplications.userId],
		references: [users.id]
	}),
}));

export const groupChatsRelations = relations(groupChats, ({one, many}) => ({
	order: one(orders, {
		fields: [groupChats.orderId],
		references: [orders.id]
	}),
	chatMessages: many(chatMessages),
	groupChatMembers: many(groupChatMembers),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	groupChat: one(groupChats, {
		fields: [chatMessages.groupChatId],
		references: [groupChats.id]
	}),
}));

export const groupChatMembersRelations = relations(groupChatMembers, ({one}) => ({
	groupChat: one(groupChats, {
		fields: [groupChatMembers.groupChatId],
		references: [groupChats.id]
	}),
	user: one(users, {
		fields: [groupChatMembers.userId],
		references: [users.id]
	}),
}));