import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { accounts, db } from '@/lib/db';
import { getEntitySeoOverride } from '@/lib/search-content-service';

type PageProps = {
  params: Promise<{ id: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';

function getAccountImages(screenshots: unknown) {
  if (!Array.isArray(screenshots)) {
    return [];
  }

  return screenshots.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

async function getPublicAccount(accountId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.accountId, accountId),
        eq(accounts.auditStatus, 'approved'),
        eq(accounts.status, 'available'),
        eq(accounts.isDeleted, false),
      ),
    )
    .limit(1);

  return rows[0] || null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getPublicAccount(id);

  if (!account) {
    return {};
  }

  const seoOverride = await getEntitySeoOverride('account', account.accountId);
  const title = seoOverride?.title || account.title;
  const description =
    seoOverride?.description ||
    account.description ||
    `哈夫币 ${account.coinsM}M，押金 ${account.deposit}，支持下单前查看详情。`;
  const images = seoOverride?.og_image
    ? [seoOverride.og_image]
    : getAccountImages(account.screenshots).slice(0, 1);
  const indexable = seoOverride?.indexable ?? true;

  return {
    title,
    description,
    robots: {
      index: Boolean(indexable),
      follow: Boolean(indexable),
    },
    openGraph: {
      title: seoOverride?.og_title || title,
      description: seoOverride?.og_description || description,
      images,
      type: 'website',
      url: `${siteUrl}/accounts/${account.accountId}`,
    },
  };
}

export default async function PublicAccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  const account = await getPublicAccount(id);

  if (!account) {
    notFound();
  }

  const seoOverride = await getEntitySeoOverride('account', account.accountId);
  const images = getAccountImages(account.screenshots);
  const price = account.accountValue || account.recommendedRental || '0';
  const description = seoOverride?.summary || seoOverride?.description || account.description || '';

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-500">商品详情页</p>
                <h1 className="text-3xl font-bold text-gray-900">{account.title}</h1>
                {description ? <p className="text-base leading-7 text-gray-600">{description}</p> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500">哈夫币</div>
                  <div className="mt-1 text-xl font-semibold text-gray-900">{String(account.coinsM)}M</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500">租金参考</div>
                  <div className="mt-1 text-xl font-semibold text-gray-900">¥{String(price)}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500">押金</div>
                  <div className="mt-1 text-xl font-semibold text-gray-900">¥{String(account.deposit)}</div>
                </div>
              </div>

              {account.description ? (
                <div className="rounded-xl border bg-gray-50/60 p-4">
                  <h2 className="text-lg font-semibold text-gray-900">账号说明</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                    {account.description}
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="rounded-2xl border bg-gray-50 p-5">
              <h2 className="text-lg font-semibold text-gray-900">下单提示</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                <p>当前页面用于搜索收录与商品展示，不改动现有首页弹窗详情与下单流程。</p>
                <p>实际购买仍可从首页列表或现有业务入口继续完成。</p>
                <p>{`商品编号：${account.accountId}`}</p>
              </div>
            </aside>
          </div>
        </section>

        {images.length > 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900">展示图片</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <div key={`${account.id}-image-${index}`} className="overflow-hidden rounded-xl border bg-gray-50">
                  <img
                    src={image}
                    alt={`${account.title}-${index + 1}`}
                    className="h-56 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: seoOverride?.title || account.title,
            description,
            image: images,
            sku: account.accountId,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'CNY',
              price: String(price),
              availability: 'https://schema.org/InStock',
              url: `${siteUrl}/accounts/${account.accountId}`,
            },
          }),
        }}
      />
    </main>
  );
}
