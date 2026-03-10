import { NextRequest, NextResponse } from 'next/server';
import { getPaymentConfig, deletePaymentConfig } from '@/lib/payment/config';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const certKeys = ['cert_path', 'key_path', 'cert_p12_password', 'cert_serial_no'];
    const results = [];

    for (const configKey of certKeys) {
      const existing = await getPaymentConfig('wechat', configKey);
      if (existing) {
        await deletePaymentConfig('wechat', configKey);
        results.push({ key: configKey, status: 'deleted' });
      } else {
        results.push({ key: configKey, status: 'not_exists' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'WeChat cert config reset successfully',
      data: results,
    });
  } catch (error: any) {
    console.error('Failed to reset cert configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset cert configs' },
      { status: 500 }
    );
  }
}
