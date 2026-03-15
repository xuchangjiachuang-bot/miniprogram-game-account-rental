import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { deleteContentPage, getContentPageById, upsertContentPage } from '@/lib/search-content-service';

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
    const page = await getContentPageById(id);
    if (!page) {
      return NextResponse.json({ success: false, error: 'CONTENT_PAGE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error: any) {
    console.error('[admin-search-content] detail failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_CONTENT_PAGE' },
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
    const page = await upsertContentPage({
      id,
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
    console.error('[admin-search-content] update failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_UPDATE_CONTENT_PAGE' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await deleteContentPage(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin-search-content] delete failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_DELETE_CONTENT_PAGE' },
      { status: 500 },
    );
  }
}
