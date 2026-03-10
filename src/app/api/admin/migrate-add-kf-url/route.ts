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
        ADD COLUMN kf_url VARCHAR(500)
      `);

      await db.execute(sql`
        COMMENT ON COLUMN wecom_customer_service.kf_url
        IS '企业微信客服链接，格式：https://work.weixin.qq.com/kfid/kfcXXXXX'
      `);

      return NextResponse.json({ success: true, message: 'kf_url column added' });
    } catch (alterError: any) {
      if (alterError.message && alterError.message.includes('column')) {
        return NextResponse.json({ success: true, message: 'kf_url column already exists' });
      }
      throw alterError;
    }
  } catch (error: any) {
    console.error('Failed to run migrate-add-kf-url:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
