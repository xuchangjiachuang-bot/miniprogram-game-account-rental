import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listAutoSeoPages } from '@/lib/auto-seo-pages';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const pages = await listAutoSeoPages();
    return NextResponse.json({ success: true, data: pages });
  } catch (error: any) {
    console.error('[admin-search-content-auto-pages] list failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_AUTO_SEO_PAGES' },
      { status: 500 },
    );
  }
}
