import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listContentPages, SearchContentError, upsertContentPage } from '@/lib/search-content-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const pages = await listContentPages();
    return NextResponse.json({ success: true, data: pages });
  } catch (error: any) {
    console.error('[admin-search-content] list failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_CONTENT_PAGES' },
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
    const page = await upsertContentPage({
      slug: String(body.slug || ''),
      pageType: String(body.pageType || 'help'),
      title: String(body.title || ''),
      summary: String(body.summary || ''),
      content: String(body.content || ''),
      faqJson: body.faqJson || [],
      seoTitle: String(body.seoTitle || ''),
      seoDescription: String(body.seoDescription || ''),
      seoSummary: String(body.seoSummary || ''),
      ogTitle: String(body.ogTitle || ''),
      ogDescription: String(body.ogDescription || ''),
      ogImage: String(body.ogImage || ''),
      indexable: Boolean(body.indexable ?? true),
      status: String(body.status || 'draft'),
    });

    return NextResponse.json({ success: true, data: page });
  } catch (error: any) {
    console.error('[admin-search-content] create failed:', error);
    if (error instanceof SearchContentError) {
      return NextResponse.json({ success: false, error: error.code }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_CREATE_CONTENT_PAGE' },
      { status: 500 },
    );
  }
}
