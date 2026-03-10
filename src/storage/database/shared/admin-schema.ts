import { pgTable, index, unique, uuid, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ==================== 管理员表 ====================

export const admins = pgTable("admins", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  username: varchar({ length: 50 }).notNull(),
  password: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 100 }),
  name: varchar({ length: 50 }),
  role: varchar({ length: 20 }).default('admin'), // admin, super_admin
  status: varchar({ length: 20 }).default('active'), // active, inactive
  lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("admins_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
  unique("admins_username_unique").on(table.username),
  unique("admins_email_unique").on(table.email),
])
