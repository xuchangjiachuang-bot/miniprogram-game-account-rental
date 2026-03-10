CREATE TABLE "account_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'frozen',
	"refund_reason" varchar(50),
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "account_edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"old_data" jsonb NOT NULL,
	"new_data" jsonb NOT NULL,
	"change_type" varchar(20) NOT NULL,
	"changed_fields" jsonb DEFAULT '[]'::jsonb,
	"reason" text,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"account_info" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"account_id" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"screenshots" jsonb,
	"coins_m" numeric(10, 2) NOT NULL,
	"safebox_count" integer DEFAULT 0,
	"energy_value" integer DEFAULT 0,
	"stamina_value" integer DEFAULT 0,
	"has_skins" boolean DEFAULT false,
	"skin_tier" varchar(20),
	"skin_count" integer DEFAULT 0,
	"has_battlepass" boolean DEFAULT false,
	"battlepass_level" integer DEFAULT 0,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"account_value" numeric(10, 2),
	"recommended_rental" numeric(10, 2),
	"rental_ratio" numeric(5, 4),
	"deposit" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2),
	"rental_days" numeric(10, 2),
	"rental_hours" numeric(10, 2),
	"rental_description" varchar(50),
	"view_count" integer DEFAULT 0,
	"trade_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'available',
	"audit_status" varchar(20) DEFAULT 'pending',
	"audit_reason" text,
	"audit_user_id" uuid,
	"audit_time" timestamp,
	"deposit_id" uuid,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"listed_at" timestamp,
	CONSTRAINT "accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "agreements_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "balance_transactions" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"order_id" varchar(36),
	"withdrawal_id" varchar(36),
	"transaction_type" varchar(30) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "chat_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"join_time" timestamp DEFAULT now(),
	"muted_until" timestamp,
	CONSTRAINT "chat_group_members_group_id_user_id_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"group_type" varchar(20) DEFAULT 'order',
	"related_order_id" uuid,
	"related_platform_id" uuid,
	"creator_id" uuid NOT NULL,
	"max_members" integer DEFAULT 10,
	"avatar" varchar(500),
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"content" text,
	"attachments" jsonb,
	"reply_to" uuid,
	"is_deleted" boolean DEFAULT false,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commission_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text DEFAULT '',
	"discount_rate" numeric(5, 2) DEFAULT '0',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"initiator_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"dispute_type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb,
	"handler_id" uuid,
	"resolution" text,
	"compensation" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"order_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" varchar(32) NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending_payment',
	"rental_duration" integer NOT NULL,
	"rental_price" numeric(10, 2) NOT NULL,
	"deposit" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"platform_commission" numeric(10, 2),
	"withdrawal_fee" numeric(10, 2),
	"seller_income" numeric(10, 2),
	"payment_method" varchar(20),
	"payment_time" timestamp,
	"transaction_id" varchar(100),
	"qrcode_url" varchar(500),
	"qrcode_uploaded_at" timestamp,
	"seller_confirmed_at" timestamp,
	"dispute_id" uuid,
	"dispute_reason" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"actual_end_time" timestamp,
	"buyer_rating" integer,
	"seller_rating" integer,
	"buyer_comment" text,
	"seller_comment" text,
	"verification_request_time" timestamp,
	"verification_deadline" timestamp,
	"verification_result" varchar(20) DEFAULT 'pending',
	"verification_remark" text,
	"dispute_evidence" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "payment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_type" varchar(20) NOT NULL,
	"config_key" varchar(50) NOT NULL,
	"config_value" text NOT NULL,
	"is_encrypted" boolean DEFAULT true,
	"description" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "payment_configs_type_key_unique" UNIQUE("config_type","config_key")
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"order_no" varchar(32) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" varchar(20) NOT NULL,
	"method" varchar(20) NOT NULL,
	"transaction_id" varchar(64),
	"third_party_order_id" varchar(64),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(50) NOT NULL,
	"config_value" text NOT NULL,
	"config_type" varchar(20) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "platform_config_config_key_key" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '5',
	"min_commission" numeric(10, 2) DEFAULT '0',
	"max_commission" numeric(10, 2) DEFAULT '100',
	"withdrawal_fee" numeric(5, 2) DEFAULT '1',
	"min_rental_price" numeric(10, 2) DEFAULT '50',
	"deposit_ratio" numeric(5, 2) DEFAULT '50',
	"coins_per_day" numeric(5, 1) DEFAULT '10',
	"min_rental_hours" integer DEFAULT 24,
	"max_coins_per_account" numeric(10, 1) DEFAULT '1000',
	"max_deposit" numeric(10, 2) DEFAULT '10000',
	"require_manual_review" boolean DEFAULT true,
	"auto_approve_verified" boolean DEFAULT false,
	"listing_deposit_amount" numeric(10, 2) DEFAULT '50',
	"order_payment_timeout" integer DEFAULT 1800,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "platform_settings_id_key" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "refund_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"refund_amount" numeric(10, 2) NOT NULL,
	"refund_reason" text NOT NULL,
	"refund_status" varchar(20) DEFAULT 'pending',
	"refund_id" varchar(100),
	"transaction_id" varchar(100),
	"refund_recv_account" varchar(100),
	"refund_success_time" timestamp,
	"refund_recv_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_configs" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"provider" varchar(20) NOT NULL,
	"name" varchar(50) NOT NULL,
	"api_key" varchar(200) DEFAULT '',
	"api_secret" varchar(200) DEFAULT '',
	"sign_name" varchar(50) DEFAULT '',
	"endpoint" varchar(200) DEFAULT '',
	"enabled" boolean DEFAULT false,
	"default_template" varchar(100) DEFAULT '',
	"max_daily_count" integer DEFAULT 10000,
	"current_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "sms_configs_id_key" UNIQUE("id"),
	CONSTRAINT "sms_configs_provider_key" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "sms_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"code" varchar(6) DEFAULT '',
	"template_code" varchar(100) DEFAULT '',
	"status" varchar(20) NOT NULL,
	"message" text,
	"request_id" varchar(100),
	"biz_id" varchar(100),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "split_records" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"order_no" varchar(32) NOT NULL,
	"receiver_type" varchar(20) NOT NULL,
	"receiver_id" varchar(36) NOT NULL,
	"receiver_name" varchar(100),
	"split_amount" numeric(10, 2) NOT NULL,
	"split_ratio" numeric(5, 2) NOT NULL,
	"commission_type" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"split_time" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(50) NOT NULL,
	"config_value" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_balances" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"available_balance" numeric(10, 2) DEFAULT '0',
	"frozen_balance" numeric(10, 2) DEFAULT '0',
	"total_withdrawn" numeric(10, 2) DEFAULT '0',
	"total_earned" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "user_balances_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"nickname" varchar(50) NOT NULL,
	"avatar" varchar(500),
	"email" varchar(100),
	"user_type" varchar(20) DEFAULT 'buyer',
	"seller_level" integer DEFAULT 1,
	"total_trades" integer DEFAULT 0,
	"total_orders" integer DEFAULT 0,
	"seller_rating" numeric(3, 2) DEFAULT '5.00',
	"is_verified" boolean DEFAULT false,
	"real_name" varchar(50),
	"id_card" varchar(20),
	"status" varchar(20) DEFAULT 'active',
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "verification_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"real_name" varchar(50) NOT NULL,
	"id_card" varchar(20) NOT NULL,
	"id_card_front_url" varchar(500) NOT NULL,
	"id_card_back_url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_comment" text,
	"verification_service" varchar(20) DEFAULT 'manual',
	"verification_result" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"withdrawal_no" varchar(32) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"username" varchar(100) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"withdrawal_fee" numeric(10, 2) NOT NULL,
	"fee_amount" numeric(10, 2) NOT NULL,
	"actual_amount" numeric(10, 2) NOT NULL,
	"withdrawal_type" varchar(20) NOT NULL,
	"account_info" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewer_id" varchar(36),
	"review_time" timestamp,
	"review_remark" text,
	"third_party_transaction_id" varchar(64),
	"failure_reason" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "withdrawals_withdrawal_no_key" UNIQUE("withdrawal_no")
);
--> statement-breakpoint
ALTER TABLE "account_deposits" ADD CONSTRAINT "account_deposits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deposits" ADD CONSTRAINT "account_deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_edit_history" ADD CONSTRAINT "account_edit_history_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_handler_id_users_id_fk" FOREIGN KEY ("handler_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_records" ADD CONSTRAINT "refund_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_records" ADD CONSTRAINT "refund_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deposits_account_id_idx" ON "account_deposits" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "account_deposits_user_id_idx" ON "account_deposits" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "account_deposits_status_idx" ON "account_deposits" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "account_edit_history_account_id_idx" ON "account_edit_history" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "account_edit_history_seller_id_idx" ON "account_edit_history" USING btree ("seller_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "account_edit_history_created_at_idx" ON "account_edit_history" USING btree ("created_at" text_ops);--> statement-breakpoint
CREATE INDEX "accounts_coins_m_idx" ON "accounts" USING btree ("coins_m" numeric_ops);--> statement-breakpoint
CREATE INDEX "accounts_price_idx" ON "accounts" USING btree ("recommended_rental" numeric_ops);--> statement-breakpoint
CREATE INDEX "accounts_seller_id_idx" ON "accounts" USING btree ("seller_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "accounts_status_idx" ON "accounts" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "accounts_audit_status_idx" ON "accounts" USING btree ("audit_status" text_ops);--> statement-breakpoint
CREATE INDEX "agreements_key_idx" ON "agreements" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "chat_group_members_group_id_idx" ON "chat_group_members" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_group_members_user_id_idx" ON "chat_group_members" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_groups_group_type_idx" ON "chat_groups" USING btree ("group_type" text_ops);--> statement-breakpoint
CREATE INDEX "chat_groups_related_order_id_idx" ON "chat_groups" USING btree ("related_order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_groups_creator_id_idx" ON "chat_groups" USING btree ("creator_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_group_id_idx" ON "chat_messages" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "commission_activities_enabled_idx" ON "commission_activities" USING btree ("enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "commission_activities_start_time_idx" ON "commission_activities" USING btree ("start_time" timestamp_ops);--> statement-breakpoint
CREATE INDEX "commission_activities_end_time_idx" ON "commission_activities" USING btree ("end_time" timestamp_ops);--> statement-breakpoint
CREATE INDEX "disputes_order_id_idx" ON "disputes" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "messages_is_read_idx" ON "messages" USING btree ("is_read" bool_ops);--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "orders_account_id_idx" ON "orders" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "orders_buyer_id_idx" ON "orders" USING btree ("buyer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "orders_seller_id_idx" ON "orders" USING btree ("seller_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "payment_configs_type_idx" ON "payment_configs" USING btree ("config_type" text_ops);--> statement-breakpoint
CREATE INDEX "payment_configs_key_idx" ON "payment_configs" USING btree ("config_key" text_ops);--> statement-breakpoint
CREATE INDEX "refund_records_order_id_idx" ON "refund_records" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "refund_records_user_id_idx" ON "refund_records" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "refund_records_refund_status_idx" ON "refund_records" USING btree ("refund_status" text_ops);--> statement-breakpoint
CREATE INDEX "sms_records_phone_idx" ON "sms_records" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "sms_records_status_idx" ON "sms_records" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "sms_records_created_at_idx" ON "sms_records" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "system_config_key_idx" ON "system_config" USING btree ("config_key" text_ops);--> statement-breakpoint
CREATE INDEX "transactions_order_id_idx" ON "transactions" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "users_seller_level_idx" ON "users" USING btree ("seller_level" int4_ops);--> statement-breakpoint
CREATE INDEX "verification_applications_user_id_idx" ON "verification_applications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "verification_applications_status_idx" ON "verification_applications" USING btree ("status" text_ops);