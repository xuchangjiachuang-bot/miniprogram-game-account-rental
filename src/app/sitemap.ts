import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { accounts, db } from '@/lib/db';
import { listAutoSeoPages } from '@/lib/auto-seo-pages';
import { listPublishedIndexablePages } from '@/lib/search-content-service';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: 'weekly', priority: 0.4 },
  ];

  try {
    const contentPages = await listPublishedIndexablePages();
    const autoPages = await listAutoSeoPages();
    const publicAccounts = await db
      .select({
        accountId: accounts.accountId,
        updatedAt: accounts.updatedAt,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.auditStatus, 'approved'),
          eq(accounts.status, 'available'),
          eq(accounts.isDeleted, false),
        ),
      )
      .limit(500);

    const dynamicPages: MetadataRoute.Sitemap = contentPages.map((page) => ({
      url: `${baseUrl}/${page.page_type}/${page.slug}`,
      lastModified: new Date(page.updated_at),
      changeFrequency: 'weekly',
      priority: page.page_type === 'help' ? 0.7 : page.page_type === 'games' ? 0.8 : 0.6,
    }));

    const manualTopicSlugs = new Set(
      contentPages.filter((page) => page.page_type === 'topics').map((page) => page.slug),
    );
    const autoTopicPages: MetadataRoute.Sitemap = autoPages
      .filter((page) => !manualTopicSlugs.has(page.slug))
      .map((page) => ({
        url: `${baseUrl}/${page.pageType}/${page.slug}`,
        lastModified: new Date(page.updatedAt),
        changeFrequency: 'daily',
        priority: 0.75,
      }));

    const accountPages: MetadataRoute.Sitemap = publicAccounts.map((account) => ({
      url: `${baseUrl}/accounts/${account.accountId}`,
      lastModified: account.updatedAt ? new Date(account.updatedAt) : undefined,
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    return [...staticPages, ...dynamicPages, ...autoTopicPages, ...accountPages];
  } catch (error) {
    console.error('[sitemap] failed to load dynamic entries, falling back to static pages', error);
    return staticPages;
  }
}
