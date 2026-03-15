import { sqlClient } from '@/lib/db';

export type ContentPageRecord = {
  id: string;
  slug: string;
  page_type: string;
  title: string;
  summary: string;
  content: string;
  faq_json: unknown;
  seo_title: string;
  seo_description: string;
  seo_summary: string;
  og_title: string;
  og_description: string;
  og_image: string;
  indexable: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentPageInput = {
  slug: string;
  pageType: string;
  title: string;
  summary: string;
  content: string;
  faqJson: unknown;
  seoTitle: string;
  seoDescription: string;
  seoSummary: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  indexable: boolean;
  status: string;
};

export class SearchContentError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeFaqJson(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function listContentPages() {
  return sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function getContentPageById(id: string) {
  const rows = await sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function findContentPageBySlug(pageType: string, slug: string) {
  const rows = await sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE page_type = ${pageType}
      AND slug = ${normalizeSlug(slug)}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function getPublishedContentPageBySlug(pageType: string, slug: string) {
  const rows = await sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE page_type = ${pageType}
      AND slug = ${normalizeSlug(slug)}
      AND status = 'published'
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function listPublishedIndexablePages(pageType?: string) {
  if (pageType) {
    return sqlClient<ContentPageRecord[]>`
      SELECT *
      FROM content_pages
      WHERE status = 'published'
        AND indexable = true
        AND page_type = ${pageType}
      ORDER BY published_at DESC NULLS LAST, updated_at DESC
    `;
  }

  return sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE status = 'published'
      AND indexable = true
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
  `;
}

export async function upsertContentPage(input: ContentPageInput & { id?: string }) {
  const slug = normalizeSlug(input.slug);
  const faqJson = normalizeFaqJson(input.faqJson);
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null;

  if (!slug) {
    throw new SearchContentError('INVALID_SLUG');
  }

  if (!input.title.trim()) {
    throw new SearchContentError('INVALID_TITLE');
  }

  const existing = await findContentPageBySlug(input.pageType, slug);
  if (existing && existing.id !== input.id) {
    throw new SearchContentError('SLUG_ALREADY_EXISTS');
  }

  if (input.id) {
    const rows = await sqlClient<ContentPageRecord[]>`
      UPDATE content_pages
      SET
        slug = ${slug},
        page_type = ${input.pageType},
        title = ${input.title},
        summary = ${input.summary},
        content = ${input.content},
        faq_json = ${JSON.stringify(faqJson)}::jsonb,
        seo_title = ${input.seoTitle},
        seo_description = ${input.seoDescription},
        seo_summary = ${input.seoSummary},
        og_title = ${input.ogTitle},
        og_description = ${input.ogDescription},
        og_image = ${input.ogImage},
        indexable = ${input.indexable},
        status = ${input.status},
        published_at = CASE
          WHEN ${input.status} = 'published' AND published_at IS NULL THEN ${publishedAt}
          WHEN ${input.status} = 'published' THEN published_at
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.id}
      RETURNING *
    `;

    return rows[0] || null;
  }

  const rows = await sqlClient<ContentPageRecord[]>`
    INSERT INTO content_pages (
      slug,
      page_type,
      title,
      summary,
      content,
      faq_json,
      seo_title,
      seo_description,
      seo_summary,
      og_title,
      og_description,
      og_image,
      indexable,
      status,
      published_at
    ) VALUES (
      ${slug},
      ${input.pageType},
      ${input.title},
      ${input.summary},
      ${input.content},
      ${JSON.stringify(faqJson)}::jsonb,
      ${input.seoTitle},
      ${input.seoDescription},
      ${input.seoSummary},
      ${input.ogTitle},
      ${input.ogDescription},
      ${input.ogImage},
      ${input.indexable},
      ${input.status},
      ${publishedAt}
    )
    RETURNING *
  `;

  return rows[0] || null;
}

export async function deleteContentPage(id: string) {
  await sqlClient`
    DELETE FROM content_pages
    WHERE id = ${id}
  `;
}
