import { sqlClient } from '@/lib/db';
import { buildAutoContentPageSeo, type ResolvedSeoFields } from '@/lib/seo-auto';

type RawAutoSeoAccount = {
  account_id: string;
  title: string;
  description: string | null;
  tags: unknown;
  custom_attributes: unknown;
  coins_m: string | null;
  recommended_rental: string | null;
  account_value: string | null;
  deposit: string | null;
  trade_count: number | null;
  view_count: number | null;
  updated_at: string | null;
};

type AutoSeoAccount = {
  accountId: string;
  title: string;
  description: string;
  tags: string[];
  platform: string;
  province: string;
  city: string;
  coinsM: number;
  recommendedRental: number;
  accountValue: number;
  deposit: number;
  tradeCount: number;
  viewCount: number;
  updatedAt: string;
};

export type AutoSeoPage = {
  pageType: 'topics';
  slug: string;
  title: string;
  summary: string;
  content: string;
  faqItems: Array<{ question: string; answer: string }>;
  seo: ResolvedSeoFields;
  updatedAt: string;
  accountCount: number;
  accountIds: string[];
};

const siteName = '游戏账号租赁平台';

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function toRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function makeSlug(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMoney(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}

function formatCountLabel(accounts: AutoSeoAccount[]) {
  const total = accounts.length;
  const avgRent = average(accounts.map((item) => item.recommendedRental || item.accountValue));
  const avgDeposit = average(accounts.map((item) => item.deposit));
  return `当前专题包含 ${total} 个在架账号，平均租金约 ${formatMoney(avgRent)} 元，平均押金约 ${formatMoney(avgDeposit)} 元。`;
}

function topItems(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .slice(0, limit);
}

async function listIndexableAccounts(): Promise<AutoSeoAccount[]> {
  const rows = await sqlClient<RawAutoSeoAccount[]>`
    SELECT
      account_id,
      title,
      description,
      tags,
      custom_attributes,
      coins_m,
      recommended_rental,
      account_value,
      deposit,
      trade_count,
      view_count,
      updated_at
    FROM accounts
    WHERE is_deleted = false
      AND audit_status = 'approved'
      AND status = 'available'
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 500
  `;

  return rows.map((row) => {
    const attributes = toRecord(row.custom_attributes);
    return {
      accountId: cleanText(row.account_id),
      title: cleanText(row.title),
      description: cleanText(row.description),
      tags: toStringArray(row.tags),
      platform: cleanText(attributes.platform),
      province: cleanText(attributes.province),
      city: cleanText(attributes.city),
      coinsM: toNumber(row.coins_m),
      recommendedRental: toNumber(row.recommended_rental),
      accountValue: toNumber(row.account_value),
      deposit: toNumber(row.deposit),
      tradeCount: toNumber(row.trade_count),
      viewCount: toNumber(row.view_count),
      updatedAt: cleanText(row.updated_at) || new Date().toISOString(),
    };
  });
}

function buildPage(title: string, summary: string, paragraphs: string[], faqItems: AutoSeoPage['faqItems'], accounts: AutoSeoAccount[], slug: string): AutoSeoPage {
  const content = paragraphs.filter(Boolean).join('\n\n');
  const seo = buildAutoContentPageSeo({
    page_type: 'topics',
    title,
    summary,
    content,
    faq_json: faqItems,
    og_image: '',
  });

  return {
    pageType: 'topics',
    slug,
    title,
    summary,
    content,
    faqItems,
    seo,
    updatedAt: accounts[0]?.updatedAt || new Date().toISOString(),
    accountCount: accounts.length,
    accountIds: accounts.map((item) => item.accountId),
  };
}

function buildOverviewPage(accounts: AutoSeoAccount[]) {
  const topPlatforms = topItems(accounts.map((item) => item.platform).filter(Boolean), 3);
  const topTags = topItems(accounts.flatMap((item) => item.tags), 5);
  const hotTagText = topTags.map(([tag]) => tag).join('、');
  const platformText = topPlatforms.map(([platform, count]) => `${platform} ${count} 个`).join('，');
  const summary = `基于平台当前真实在架账号自动生成的账号租赁市场页，覆盖账号数量、租金、押金和热门标签。`;

  return buildPage(
    '账号租赁市场总览',
    summary,
    [
      `${siteName}会根据当前真实在架账号自动生成市场总览页，帮助搜索引擎和 AI 系统快速理解平台主营内容。${formatCountLabel(accounts)}`,
      platformText ? `当前主要上架平台包括：${platformText}。` : '',
      hotTagText ? `当前高频出现的标签包括：${hotTagText}。这些标签会随着真实上架数据自动变化。` : '',
      '当卖家新增、下架或调整商品时，专题页的描述、FAQ 和 sitemap 会一起更新，不需要手工维护。',
    ],
    [
      {
        question: '这个市场总览页的数据来自哪里？',
        answer: '来自当前已审核通过且正在上架的真实账号数据，不使用演示数据。',
      },
      {
        question: '专题页会自动更新吗？',
        answer: '会。账号数量、价格区间、标签和平台分布变化后，页面内容会随业务数据自动刷新。',
      },
      {
        question: '用户能在这里直接下单吗？',
        answer: '专题页主要用于搜索收录和信息聚合，用户可以继续进入商品详情页查看具体账号并下单。',
      },
    ],
    accounts,
    'market-overview',
  );
}

function buildPlatformPages(accounts: AutoSeoAccount[]) {
  return topItems(accounts.map((item) => item.platform).filter(Boolean), 6).map(([platform]) => {
    const platformAccounts = accounts.filter((item) => item.platform === platform);
    return buildPage(
      `${platform} 账号出租专区`,
      `基于当前 ${platform} 平台真实在架账号自动生成的聚合页，帮助用户快速查看该平台下的租号商品。`,
      [
        `${platform} 专题页会自动收录当前平台下可租的账号商品。${formatCountLabel(platformAccounts)}`,
        '系统会自动结合账号标题、押金、租金、皮肤标签和基础属性生成页面摘要，不需要人工重复维护。',
        '如果平台下的商品数量变化，这个专题页的内容和可收录链接也会同步刷新。',
      ],
      [
        {
          question: `${platform} 专题页包含什么内容？`,
          answer: `会展示当前 ${platform} 平台下已审核通过并正在上架的真实账号聚合信息。`,
        },
        {
          question: `为什么这个页面适合做 SEO？`,
          answer: '因为它稳定反映真实业务供给，能持续输出与平台、租号、交易相关的聚合内容。',
        },
      ],
      platformAccounts,
      `platform-${makeSlug(platform)}`,
    );
  });
}

function buildTagPages(accounts: AutoSeoAccount[]) {
  return topItems(accounts.flatMap((item) => item.tags), 8).map(([tag]) => {
    const tagAccounts = accounts.filter((item) => item.tags.includes(tag));
    return buildPage(
      `${tag} 相关账号专题`,
      `基于真实商品标签自动聚合的专题页，帮助用户查看带有 ${tag} 标签的账号。`,
      [
        `当前共有 ${tagAccounts.length} 个在架账号带有“${tag}”标签。${formatCountLabel(tagAccounts)}`,
        '该专题页会随着卖家标签数据变化自动调整，适合承接长尾搜索和 AI 结果引用。',
        '用户可以从专题页继续进入具体商品详情页查看图片、价格、押金和交易说明。',
      ],
      [
        {
          question: `“${tag}”专题页的数据会自动变化吗？`,
          answer: '会，只要真实在架商品的标签发生变化，专题聚合结果就会自动刷新。',
        },
        {
          question: `这个专题页适合搜索哪些需求？`,
          answer: `适合承接包含“${tag}”、账号租赁、账号交易、商品详情等组合搜索需求。`,
        },
      ],
      tagAccounts,
      `tag-${makeSlug(tag)}`,
    );
  });
}

function buildRegionPages(accounts: AutoSeoAccount[]) {
  return topItems(accounts.map((item) => item.province).filter(Boolean), 5).map(([province]) => {
    const regionAccounts = accounts.filter((item) => item.province === province);
    return buildPage(
      `${province} 账号出租专题`,
      `基于真实卖家地域信息自动生成的专题页，聚合 ${province} 相关在架账号。`,
      [
        `${province} 专题页目前聚合了 ${regionAccounts.length} 个真实在架账号。${formatCountLabel(regionAccounts)}`,
        '地域专题有助于搜索系统理解平台供给分布，也能为后续城市页、卖家专题页提供内链入口。',
      ],
      [
        {
          question: `${province} 专题页为什么会自动生成？`,
          answer: '因为卖家资料中包含省市信息，系统会自动汇总真实在架账号并生成聚合内容。',
        },
      ],
      regionAccounts,
      `region-${makeSlug(province)}`,
    );
  });
}

export async function listAutoSeoPages() {
  const accounts = await listIndexableAccounts();

  if (accounts.length === 0) {
    return [];
  }

  return [
    buildOverviewPage(accounts),
    ...buildPlatformPages(accounts),
    ...buildTagPages(accounts),
    ...buildRegionPages(accounts),
  ];
}

export async function getAutoSeoPageBySlug(pageType: string, slug: string) {
  if (pageType !== 'topics') {
    return null;
  }

  const pages = await listAutoSeoPages();
  return pages.find((page) => page.slug === slug) || null;
}
