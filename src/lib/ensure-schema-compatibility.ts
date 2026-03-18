import { db } from '@/lib/db';

let schemaCompatibilityReady = false;

export async function ensureSchemaCompatibility() {
  if (schemaCompatibilityReady) {
    return;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100) UNIQUE,
      name VARCHAR(50),
      role VARCHAR(20) NOT NULL DEFAULT 'admin',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS email VARCHAR(100),
      ADD COLUMN IF NOT EXISTS name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  await db.execute(`
    ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS screenshots JSONB,
      ADD COLUMN IF NOT EXISTS safebox_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS energy_value INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stamina_value INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS has_skins BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS skin_tier VARCHAR(20),
      ADD COLUMN IF NOT EXISTS skin_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS has_battlepass BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS battlepass_level INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS account_value NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS recommended_rental NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS rental_ratio NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS rental_days NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS rental_hours NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS rental_description VARCHAR(50),
      ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS trade_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS listed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS audit_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS audit_reason TEXT,
      ADD COLUMN IF NOT EXISTS audit_user_id UUID,
      ADD COLUMN IF NOT EXISTS audit_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deposit_id UUID,
      ADD COLUMN IF NOT EXISTS username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS password VARCHAR(200);
  `);

  schemaCompatibilityReady = true;
}
