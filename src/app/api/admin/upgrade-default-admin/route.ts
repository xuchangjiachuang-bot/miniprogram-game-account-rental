import { NextRequest, NextResponse } from 'next/server';
import { upgradeDefaultAdmin } from '@/lib/upgrade-admin';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const result = await upgradeDefaultAdmin();

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Failed to upgrade default admin:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upgrade default admin' },
      { status: 500 }
    );
  }
}
