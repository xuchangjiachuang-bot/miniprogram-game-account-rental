import { db } from '@/lib/db';

export async function initSearchContentTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS content_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(120) NOT NULL UNIQUE,
        page_type VARCHAR(30) NOT NULL DEFAULT 'help',
        title VARCHAR(200) NOT NULL,
        summary TEXT DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        faq_json JSONB DEFAULT '[]'::jsonb,
        seo_title VARCHAR(200) DEFAULT '',
        seo_description TEXT DEFAULT '',
        seo_summary TEXT DEFAULT '',
        og_title VARCHAR(200) DEFAULT '',
        og_description TEXT DEFAULT '',
        og_image VARCHAR(500) DEFAULT '',
        indexable BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS content_pages_status_idx
      ON content_pages (status);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS content_pages_page_type_idx
      ON content_pages (page_type);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_entity_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(30) NOT NULL,
        entity_key VARCHAR(120) NOT NULL,
        title VARCHAR(200) DEFAULT '',
        description TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        og_title VARCHAR(200) DEFAULT '',
        og_description TEXT DEFAULT '',
        og_image VARCHAR(500) DEFAULT '',
        indexable BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_type, entity_key)
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS seo_entity_overrides_type_idx
      ON seo_entity_overrides (entity_type);
    `);

    return { success: true };
  } catch (error: any) {
    console.error('[initSearchContentTables] failed:', error);
    return { success: false, error: error.message };
  }
}
