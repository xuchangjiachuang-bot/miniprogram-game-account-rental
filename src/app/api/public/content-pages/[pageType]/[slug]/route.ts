import { NextRequest, NextResponse } from 'next/server';
import { getAutoSeoPageBySlug } from '@/lib/auto-seo-pages';
import { getPublishedContentPageBySlug } from '@/lib/search-content-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageType: string; slug: string }> },
) {
  try {
    const { pageType, slug } = await params;
    const page = await getPublishedContentPageBySlug(pageType, slug);
    const autoPage = page ? null : await getAutoSeoPageBySlug(pageType, slug);

    if (!page && !autoPage) {
      return NextResponse.json({ success: false, error: 'CONTENT_PAGE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page || autoPage });
  } catch (error: any) {
    console.error('[public-content-page] load failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FAILED_TO_LOAD_CONTENT_PAGE' },
      { status: 500 },
    );
  }
}
