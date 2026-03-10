import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    try {
      await db.execute(sql`
        ALTER TABLE wecom_customer_service
        ALTER COLUMN token DROP NOT NULL
      `);
    } catch {
      console.log('token may already be nullable');
    }

    try {
      await db.execute(sql`
        ALTER TABLE wecom_customer_service
        ALTER COLUMN encoding_aes_key DROP NOT NULL
      `);
    } catch {
      console.log('encoding_aes_key may already be nullable');
    }

    try {
      await db.execute(sql`
        ALTER TABLE wecom_customer_service
        ALTER COLUMN kf_id DROP NOT NULL
      `);
    } catch {
      console.log('kf_id may already be nullable');
    }

    try {
      await db.execute(sql`
        ALTER TABLE wecom_customer_service
        ALTER COLUMN kf_name DROP NOT NULL
      `);
    } catch {
      console.log('kf_name may already be nullable');
    }

    return NextResponse.json({ success: true, message: 'WeCom table migration completed' });
  } catch (error: any) {
    console.error('Failed to migrate wecom table:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
