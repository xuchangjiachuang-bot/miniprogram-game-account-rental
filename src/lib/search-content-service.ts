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

export type EntitySeoOverrideRecord = {
  id: string;
  entity_type: string;
  entity_key: string;
  title: string;
  description: string;
  summary: string;
  og_title: string;
  og_description: string;
  og_image: string;
  indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type EntitySeoOverrideInput = {
  entityType: string;
  entityKey: string;
  title: string;
  description: string;
  summary: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  indexable: boolean;
};

export type AccountSeoListItem = {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  coins_m: string | null;
  account_value: string | null;
  recommended_rental: string | null;
  deposit: string;
  screenshots: unknown;
  status: string | null;
  audit_status: string | null;
  is_deleted: boolean | null;
  updated_at: string | null;
  seo_override_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_summary: string | null;
  seo_og_title: string | null;
  seo_og_description: string | null;
  seo_og_image: string | null;
  seo_indexable: boolean | null;
};

export type PublicAccountLinkItem = {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  coins_m: string;
  deposit: string;
  account_value: string | null;
  recommended_rental: string | null;
  updated_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export async function listPublicAccountLinksByIds(accountIds: string[], limit = 6) {
  if (accountIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(accountIds.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
  if (uniqueIds.length === 0) {
    return [];
  }

  return sqlClient<PublicAccountLinkItem[]>`
    SELECT
      a.id,
      a.account_id,
      a.title,
      a.description,
      a.coins_m,
      a.deposit,
      a.account_value,
      a.recommended_rental,
      a.updated_at,
      s.title AS seo_title,
      s.description AS seo_description
    FROM accounts a
    LEFT JOIN seo_entity_overrides s
      ON s.entity_type = 'account'
     AND s.entity_key = a.account_id
    WHERE a.is_deleted = false
      AND a.audit_status = 'approved'
      AND a.status = 'available'
      AND COALESCE(s.indexable, true) = true
      AND a.account_id = ANY(${uniqueIds})
    ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
    LIMIT ${limit}
  `;
}

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

function normalizeEntityType(entityType: string) {
  return entityType.trim().toLowerCase();
}

function normalizeEntityKey(entityKey: string) {
  return entityKey.trim();
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

export async function listRelatedPublishedContentPages(
  pageType: string,
  excludeSlug: string,
  limit = 4,
) {
  return sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE status = 'published'
      AND indexable = true
      AND page_type = ${pageType}
      AND slug <> ${normalizeSlug(excludeSlug)}
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
    LIMIT ${limit}
  `;
}

export async function listLatestPublishedContentPages(limit = 6) {
  return sqlClient<ContentPageRecord[]>`
    SELECT *
    FROM content_pages
    WHERE status = 'published'
      AND indexable = true
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
    LIMIT ${limit}
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

export async function getEntitySeoOverride(entityType: string, entityKey: string) {
  const rows = await sqlClient<EntitySeoOverrideRecord[]>`
    SELECT *
    FROM seo_entity_overrides
    WHERE entity_type = ${normalizeEntityType(entityType)}
      AND entity_key = ${normalizeEntityKey(entityKey)}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function upsertEntitySeoOverride(input: EntitySeoOverrideInput) {
  const entityType = normalizeEntityType(input.entityType);
  const entityKey = normalizeEntityKey(input.entityKey);

  if (!entityType || !entityKey) {
    throw new SearchContentError('INVALID_ENTITY_KEY');
  }

  const rows = await sqlClient<EntitySeoOverrideRecord[]>`
    INSERT INTO seo_entity_overrides (
      entity_type,
      entity_key,
      title,
      description,
      summary,
      og_title,
      og_description,
      og_image,
      indexable,
      created_at,
      updated_at
    ) VALUES (
      ${entityType},
      ${entityKey},
      ${input.title},
      ${input.description},
      ${input.summary},
      ${input.ogTitle},
      ${input.ogDescription},
      ${input.ogImage},
      ${input.indexable},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (entity_type, entity_key)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      summary = EXCLUDED.summary,
      og_title = EXCLUDED.og_title,
      og_description = EXCLUDED.og_description,
      og_image = EXCLUDED.og_image,
      indexable = EXCLUDED.indexable,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return rows[0] || null;
}

export async function listAccountSeoOverrides(search?: string) {
  const keyword = search?.trim();
  if (keyword) {
    return sqlClient<AccountSeoListItem[]>`
      SELECT
        a.id,
        a.account_id,
        a.title,
        a.description,
        a.coins_m,
        a.account_value,
        a.recommended_rental,
        a.deposit,
        a.screenshots,
        a.status,
        a.audit_status,
        a.is_deleted,
        a.updated_at,
        s.id AS seo_override_id,
        s.title AS seo_title,
        s.description AS seo_description,
        s.summary AS seo_summary,
        s.og_title AS seo_og_title,
        s.og_description AS seo_og_description,
        s.og_image AS seo_og_image,
        s.indexable AS seo_indexable
      FROM accounts a
      LEFT JOIN seo_entity_overrides s
        ON s.entity_type = 'account'
       AND s.entity_key = a.account_id
      WHERE a.is_deleted = false
        AND (
          a.account_id ILIKE ${`%${keyword}%`}
          OR a.title ILIKE ${`%${keyword}%`}
          OR COALESCE(a.description, '') ILIKE ${`%${keyword}%`}
        )
      ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
      LIMIT 100
    `;
  }

  return sqlClient<AccountSeoListItem[]>`
    SELECT
      a.id,
      a.account_id,
      a.title,
      a.description,
      a.coins_m,
      a.account_value,
      a.recommended_rental,
      a.deposit,
      a.screenshots,
      a.status,
      a.audit_status,
      a.is_deleted,
      a.updated_at,
      s.id AS seo_override_id,
      s.title AS seo_title,
      s.description AS seo_description,
      s.summary AS seo_summary,
      s.og_title AS seo_og_title,
      s.og_description AS seo_og_description,
      s.og_image AS seo_og_image,
      s.indexable AS seo_indexable
    FROM accounts a
    LEFT JOIN seo_entity_overrides s
      ON s.entity_type = 'account'
     AND s.entity_key = a.account_id
    WHERE a.is_deleted = false
    ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
    LIMIT 100
  `;
}

export async function listPublicAccountLinks(limit = 6, excludeAccountId?: string) {
  if (excludeAccountId) {
    return sqlClient<PublicAccountLinkItem[]>`
      SELECT
        a.id,
        a.account_id,
        a.title,
        a.description,
        a.coins_m,
        a.deposit,
        a.account_value,
        a.recommended_rental,
        a.updated_at,
        s.title AS seo_title,
        s.description AS seo_description
      FROM accounts a
      LEFT JOIN seo_entity_overrides s
        ON s.entity_type = 'account'
       AND s.entity_key = a.account_id
      WHERE a.is_deleted = false
        AND a.audit_status = 'approved'
        AND a.status = 'available'
        AND a.account_id <> ${excludeAccountId}
        AND COALESCE(s.indexable, true) = true
      ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
      LIMIT ${limit}
    `;
  }

  return sqlClient<PublicAccountLinkItem[]>`
    SELECT
      a.id,
      a.account_id,
      a.title,
      a.description,
      a.coins_m,
      a.deposit,
      a.account_value,
      a.recommended_rental,
      a.updated_at,
      s.title AS seo_title,
      s.description AS seo_description
    FROM accounts a
    LEFT JOIN seo_entity_overrides s
      ON s.entity_type = 'account'
     AND s.entity_key = a.account_id
    WHERE a.is_deleted = false
      AND a.audit_status = 'approved'
      AND a.status = 'available'
      AND COALESCE(s.indexable, true) = true
    ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
    LIMIT ${limit}
  `;
}
