import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublishedContentPageBySlug,
  listLatestPublishedContentPages,
  listPublicAccountLinks,
  listRelatedPublishedContentPages,
} from '@/lib/search-content-service';

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
  const relatedPages = await listRelatedPublishedContentPages(pageType, page.slug, 4);
  const latestPages = await listLatestPublishedContentPages(6);
  const featuredAccounts = await listPublicAccountLinks(4);
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
        <nav className="text-sm text-gray-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-gray-900">
                首页
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`/${pageType}/${page.slug}`} className="text-gray-700">
                {page.title}
              </Link>
            </li>
          </ol>
        </nav>

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

        {relatedPages.length > 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900">相关内容</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {relatedPages.map((item) => (
                <Link
                  key={item.id}
                  href={`/${item.page_type}/${item.slug}`}
                  className="rounded-xl border bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-white"
                >
                  <div className="font-medium text-gray-900">{item.title}</div>
                  {item.summary ? (
                    <p className="mt-2 text-sm leading-6 text-gray-600">{item.summary}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {featuredAccounts.length > 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-gray-900">最新商品</h2>
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
                返回首页继续浏览
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {featuredAccounts.map((item) => {
                const price = item.account_value || item.recommended_rental || '0';
                return (
                  <Link
                    key={item.id}
                    href={`/accounts/${item.account_id}`}
                    className="rounded-xl border bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-white"
                  >
                    <div className="font-medium text-gray-900">{item.seo_title || item.title}</div>
                    <p className="mt-2 text-sm text-gray-600">{`哈夫币 ${item.coins_m}M · 租金 ¥${price} · 押金 ¥${item.deposit}`}</p>
                    {(item.seo_description || item.description) ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                        {item.seo_description || item.description}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {latestPages.length > 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900">更多收录内容</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {latestPages.map((item) => (
                <Link
                  key={item.id}
                  href={`/${item.page_type}/${item.slug}`}
                  className="rounded-full border px-4 py-2 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  {item.title}
                </Link>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: '首页',
                item: process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: page.title,
                item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top'}/${page.page_type}/${page.slug}`,
              },
            ],
          }),
        }}
      />
    </main>
  );
}
