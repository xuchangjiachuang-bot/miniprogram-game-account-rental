import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { accounts, db } from '@/lib/db';
import { listPublishedIndexablePages } from '@/lib/search-content-service';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const contentPages = await listPublishedIndexablePages();
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

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: 'weekly', priority: 0.4 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = contentPages.map((page) => ({
    url: `${baseUrl}/${page.page_type}/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: 'weekly',
    priority: page.page_type === 'help' ? 0.7 : page.page_type === 'games' ? 0.8 : 0.6,
  }));

  const accountPages: MetadataRoute.Sitemap = publicAccounts.map((account) => ({
    url: `${baseUrl}/accounts/${account.accountId}`,
    lastModified: account.updatedAt ? new Date(account.updatedAt) : undefined,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticPages, ...dynamicPages, ...accountPages];
}
