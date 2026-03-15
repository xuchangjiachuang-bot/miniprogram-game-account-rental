import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getEntitySeoOverride, SearchContentError, upsertEntitySeoOverride } from '@/lib/search-content-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const record = await getEntitySeoOverride('account', id);
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('[admin-search-content-accounts] detail failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_ACCOUNT_SEO_OVERRIDE' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const record = await upsertEntitySeoOverride({
      entityType: 'account',
      entityKey: id,
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
    console.error('[admin-search-content-accounts] update failed:', error);
    if (error instanceof SearchContentError) {
      return NextResponse.json({ success: false, error: error.code }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_UPDATE_ACCOUNT_SEO_OVERRIDE' },
      { status: 500 },
    );
  }
}
