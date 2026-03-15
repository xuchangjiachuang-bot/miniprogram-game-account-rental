import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  listAccountSeoOverrides,
  SearchContentError,
  upsertEntitySeoOverride,
} from '@/lib/search-content-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const accounts = await listAccountSeoOverrides(search);
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error('[admin-search-content-accounts] list failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_ACCOUNT_SEO_OVERRIDES' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const record = await upsertEntitySeoOverride({
      entityType: 'account',
      entityKey: String(body.entityKey || ''),
      title: String(body.title || ''),
      description: String(body.description || ''),
      summary: String(body.summary || ''),
      ogTitle: String(body.ogTitle || ''),
      ogDescription: String(body.ogDescription || ''),
      ogImage: String(body.ogImage || ''),
      indexable: Boolean(body.indexable ?? true),
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('[admin-search-content-accounts] upsert failed:', error);
    if (error instanceof SearchContentError) {
      return NextResponse.json({ success: false, error: error.code }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_SAVE_ACCOUNT_SEO_OVERRIDE' },
      { status: 500 },
    );
  }
}
