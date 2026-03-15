type ContentPageLike = {
  page_type: string;
  title: string;
  summary: string;
  content: string;
  faq_json?: unknown;
  seo_title?: string;
  seo_description?: string;
  seo_summary?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
};

type AccountLike = {
  accountId?: string;
  account_id?: string;
  title: string;
  description?: string | null;
  coinsM?: string | number | null;
  coins_m?: string | number | null;
  deposit?: string | number | null;
  accountValue?: string | number | null;
  account_value?: string | number | null;
  recommendedRental?: string | number | null;
  recommended_rental?: string | number | null;
  screenshots?: unknown;
};

export type ResolvedSeoFields = {
  title: string;
  description: string;
  summary: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export type SeoSuggestionBundle = {
  keywords: string[];
  faqSuggestions: Array<{ question: string; answer: string }>;
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  help: '帮助中心',
  rules: '规则说明',
  topics: '专题内容',
  games: '游戏类目',
};

function cleanText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimText(value: string, maxLength: number) {
  const text = cleanText(value);
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function firstImage(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  const image = value.find((item) => typeof item === 'string' && item.trim().length > 0);
  return typeof image === 'string' ? image : '';
}

function faqCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function priceText(value: string | number | null | undefined) {
  const text = cleanText(value == null ? '' : String(value));
  return text || '0';
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((item) => cleanText(item))
        .filter(Boolean),
    ),
  );
}

export function buildAutoContentPageSeo(page: ContentPageLike): ResolvedSeoFields {
  const pageTypeLabel = PAGE_TYPE_LABELS[page.page_type] || '内容页面';
  const summary = cleanText(page.summary);
  const contentSnippet = trimText(page.content, 80);
  const totalFaq = faqCount(page.faq_json);

  const title = trimText(`${page.title} - ${pageTypeLabel} - 游戏账号租赁平台`, 60);
  const description = trimText(
    summary ||
      `${page.title}，提供${pageTypeLabel}说明、交易指引和常见问题解答。${contentSnippet}`,
    140,
  );
  const autoSummary = trimText(
    summary ||
      `${page.title}属于${pageTypeLabel}内容，用于帮助用户快速理解规则、流程和常见问题。${totalFaq > 0 ? `包含 ${totalFaq} 个常见问题。` : ''} ${contentSnippet}`,
    150,
  );

  return {
    title,
    description,
    summary: autoSummary,
    ogTitle: trimText(`${page.title} | ${pageTypeLabel}`, 48),
    ogDescription: trimText(description, 110),
    ogImage: cleanText(page.og_image),
  };
}

export function resolveContentPageSeo(page: ContentPageLike): ResolvedSeoFields {
  const autoSeo = buildAutoContentPageSeo(page);

  return {
    title: cleanText(page.seo_title) || autoSeo.title,
    description: cleanText(page.seo_description) || autoSeo.description,
    summary: cleanText(page.seo_summary) || autoSeo.summary,
    ogTitle: cleanText(page.og_title) || autoSeo.ogTitle,
    ogDescription: cleanText(page.og_description) || autoSeo.ogDescription,
    ogImage: cleanText(page.og_image) || autoSeo.ogImage,
  };
}

export function buildAutoAccountSeo(account: AccountLike): ResolvedSeoFields {
  const coins = priceText(account.coinsM ?? account.coins_m);
  const deposit = priceText(account.deposit);
  const price = priceText(
    account.accountValue ?? account.account_value ?? account.recommendedRental ?? account.recommended_rental,
  );
  const accountId = cleanText(account.accountId ?? account.account_id);
  const descriptionText = cleanText(account.description);

  const title = trimText(`${account.title} - 哈夫币${coins}M - 租金¥${price} - 押金¥${deposit}`, 60);
  const description = trimText(
    descriptionText ||
      `${account.title}，哈夫币 ${coins}M，参考租金 ¥${price}，押金 ¥${deposit}。支持下单前查看商品详情与交易说明。`,
    140,
  );
  const summary = trimText(
    `${account.title} 的商品详情页，核心信息包括哈夫币 ${coins}M、参考租金 ¥${price}、押金 ¥${deposit}。${descriptionText || '适合搜索收录和 AI 摘要引用。'}${accountId ? ` 商品编号：${accountId}。` : ''}`,
    150,
  );

  return {
    title,
    description,
    summary,
    ogTitle: trimText(`${account.title} | 商品详情`, 48),
    ogDescription: trimText(description, 110),
    ogImage: firstImage(account.screenshots),
  };
}

export function resolveAccountSeo(
  account: AccountLike,
  override?: {
    title?: string | null;
    description?: string | null;
    summary?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image?: string | null;
  } | null,
): ResolvedSeoFields {
  const autoSeo = buildAutoAccountSeo(account);

  return {
    title: cleanText(override?.title) || autoSeo.title,
    description: cleanText(override?.description) || autoSeo.description,
    summary: cleanText(override?.summary) || autoSeo.summary,
    ogTitle: cleanText(override?.og_title) || autoSeo.ogTitle,
    ogDescription: cleanText(override?.og_description) || autoSeo.ogDescription,
    ogImage: cleanText(override?.og_image) || autoSeo.ogImage,
  };
}

export function buildContentPageSeoSuggestions(page: ContentPageLike): SeoSuggestionBundle {
  const pageTypeLabel = PAGE_TYPE_LABELS[page.page_type] || '内容页面';
  const keywords = uniqueValues([
    page.title,
    `${page.title}攻略`,
    `${page.title}说明`,
    `${page.title}常见问题`,
    `${pageTypeLabel}`,
    `${pageTypeLabel}指引`,
    '游戏账号租赁',
    '租号平台',
  ]).slice(0, 8);

  return {
    keywords,
    faqSuggestions: [
      {
        question: `${page.title}适合哪些用户查看？`,
        answer: `适合想快速了解${page.title}相关规则、流程和注意事项的用户。`,
      },
      {
        question: `${page.title}里通常包含哪些信息？`,
        answer: `通常会包含核心说明、操作指引、交易注意事项以及常见问题。`,
      },
      {
        question: `查看${page.title}后还需要做什么？`,
        answer: '建议继续查看相关规则、帮助内容或商品详情页，完成后续操作。',
      },
    ],
  };
}

export function buildAccountSeoSuggestions(account: AccountLike): SeoSuggestionBundle {
  const coins = priceText(account.coinsM ?? account.coins_m);
  const deposit = priceText(account.deposit);
  const price = priceText(
    account.accountValue ?? account.account_value ?? account.recommendedRental ?? account.recommended_rental,
  );

  const keywords = uniqueValues([
    account.title,
    `${account.title}租号`,
    `${account.title}账号详情`,
    `哈夫币${coins}M`,
    `押金${deposit}`,
    `租金${price}`,
    '游戏账号租赁',
    '账号交易平台',
  ]).slice(0, 8);

  return {
    keywords,
    faqSuggestions: [
      {
        question: `${account.title}的核心配置是什么？`,
        answer: `核心信息包括哈夫币 ${coins}M、参考租金 ¥${price}、押金 ¥${deposit}。`,
      },
      {
        question: `下单前需要重点确认什么？`,
        answer: '建议重点确认商品说明、账号配置、押金和租金，再进入现有下单流程。',
      },
      {
        question: `这个商品详情页的作用是什么？`,
        answer: '主要用于公开展示、搜索收录和帮助用户在下单前快速了解商品信息。',
      },
    ],
  };
}
