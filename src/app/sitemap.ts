import type { MetadataRoute } from 'next';
import { listPublishedIndexablePages } from '@/lib/search-content-service';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const contentPages = await listPublishedIndexablePages();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: 'weekly', priority: 0.4 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = contentPages.map((page) => ({
    url: `${baseUrl}/${page.page_type}/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: 'weekly',
    priority: page.page_type === 'help' ? 0.7 : 0.6,
  }));

  return [...staticPages, ...dynamicPages];
}
