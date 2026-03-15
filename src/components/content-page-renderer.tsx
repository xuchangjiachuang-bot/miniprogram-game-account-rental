import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedContentPageBySlug } from '@/lib/search-content-service';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function splitParagraphs(content: string) {
  return content
    .split(/\r?\n\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function generateContentPageMetadata(
  pageType: string,
  { params }: PageProps,
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedContentPageBySlug(pageType, slug);

  if (!page) {
    return {};
  }

  const title = page.seo_title || page.title;
  const description = page.seo_description || page.summary || '';

  return {
    title,
    description,
    robots: {
      index: Boolean(page.indexable),
      follow: Boolean(page.indexable),
    },
    openGraph: {
      title: page.og_title || title,
      description: page.og_description || description,
      images: page.og_image ? [page.og_image] : undefined,
      type: 'article',
    },
  };
}

export async function renderContentPage(pageType: string, { params }: PageProps) {
  const { slug } = await params;
  const page = await getPublishedContentPageBySlug(pageType, slug);

  if (!page) {
    notFound();
  }

  const faqItems = Array.isArray(page.faq_json) ? page.faq_json : [];
  const faqStructuredData = faqItems
    .filter((item: any) => item?.question && item?.answer)
    .map((item: any) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <article className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <header className="space-y-3 border-b pb-6">
            <p className="text-sm text-gray-500">
              更新于 {new Date(page.updated_at).toLocaleDateString('zh-CN')}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
            {page.summary ? <p className="text-base leading-7 text-gray-600">{page.summary}</p> : null}
          </header>

          <div className="space-y-5 pt-6 text-[15px] leading-8 text-gray-700">
            {splitParagraphs(page.content).map((paragraph, index) => (
              <p key={`${page.id}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        {faqItems.length > 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900">常见问题</h2>
            <div className="mt-6 space-y-4">
              {faqItems.map((item: any, index) => (
                <div key={`${page.id}-faq-${index}`} className="rounded-xl border bg-gray-50 p-4">
                  <h3 className="font-medium text-gray-900">{item?.question || ''}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{item?.answer || ''}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {faqStructuredData.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqStructuredData,
            }),
          }}
        />
      ) : null}
    </main>
  );
}
