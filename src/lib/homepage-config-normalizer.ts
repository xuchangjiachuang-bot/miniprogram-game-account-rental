type CarouselItem = {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  order?: number;
  enabled?: boolean;
};

type LogoItem = {
  id?: string;
  name?: string;
  type?: 'image' | 'text';
  imageUrl?: string;
  text?: string;
  textStyle?: {
    fontSize?: string;
    fontWeight?: string;
  };
  linkUrl?: string;
  enabled?: boolean;
};

type FooterInfo = {
  copyright?: string;
  icpNumber?: string;
  publicSecurityNumber?: string;
  otherInfo?: string;
};

type HomepageConfig = {
  carousels?: CarouselItem[];
  logos?: LogoItem[];
  skinOptions?: unknown[];
  footerInfo?: FooterInfo;
};

const HOMEPAGE_FALLBACK = {
  carousels: [
    {
      id: '1',
      title: '三角洲行动哈夫币租赁',
      description: '安全可靠，快速交易，畅享游戏乐趣',
      imageUrl: '/images/carousel-1.svg',
      linkUrl: '/',
      order: 0,
      enabled: true,
    },
    {
      id: '2',
      title: '海量账号随心选',
      description: '从基础号到高配号，满足不同租号需求',
      imageUrl: '/images/carousel-2.svg',
      linkUrl: '/',
      order: 1,
      enabled: true,
    },
  ],
  logos: [
    {
      id: '1',
      name: '主 LOGO',
      type: 'text' as const,
      text: '哈夫币租赁平台',
      textStyle: {
        fontSize: 'xl',
        fontWeight: 'bold',
      },
      linkUrl: '/',
      enabled: true,
    },
  ],
  footerInfo: {
    copyright: '© 2026 哈夫币租赁平台. 保留所有权利.',
    icpNumber: '',
    publicSecurityNumber: '',
    otherInfo: '',
  },
};

const LEGACY_IMAGE_MAP: Record<string, string> = {
  '/images/carousel-1.jpg': '/images/carousel-1.svg',
  '/images/carousel-2.jpg': '/images/carousel-2.svg',
};

function normalizeLinkUrl(value: string | null | undefined, fallback: string): string {
  const candidate = String(value || '').trim() || fallback;

  if (!candidate) {
    return '/';
  }

  if (candidate === '/accounts' || candidate === '/accounts/') {
    return '/';
  }

  return candidate;
}

function looksLikeMojibake(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed.includes('锟')
    || trimmed.includes('�')
    || /[ÃÂÐÑäåæçèéêëìíîïðñòóôõöøùúûü]/.test(trimmed)
    || /[ä¸åæçéèêï¼]/.test(trimmed);
}

function normalizeText(value: string | null | undefined, fallback: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed || looksLikeMojibake(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function normalizeImageUrl(value: string | null | undefined, fallback: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return fallback;
  }

  return LEGACY_IMAGE_MAP[trimmed] || trimmed;
}

export function normalizeHomepageConfig(rawConfig: HomepageConfig | null | undefined): HomepageConfig {
  const sourceCarousels = Array.isArray(rawConfig?.carousels)
    ? rawConfig.carousels
    : HOMEPAGE_FALLBACK.carousels;

  const carousels = sourceCarousels.map((item, index) => {
    const fallback = HOMEPAGE_FALLBACK.carousels[index] || HOMEPAGE_FALLBACK.carousels[0];
    return {
      id: String(item?.id || fallback.id),
      title: normalizeText(item?.title, fallback.title),
      description: normalizeText(item?.description, fallback.description),
      imageUrl: normalizeImageUrl(item?.imageUrl, fallback.imageUrl),
      linkUrl: normalizeLinkUrl(item?.linkUrl, fallback.linkUrl),
      order: typeof item?.order === 'number' ? item.order : fallback.order,
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : fallback.enabled,
    };
  });

  const sourceLogos = Array.isArray(rawConfig?.logos)
    ? rawConfig.logos
    : HOMEPAGE_FALLBACK.logos;

  const logos = sourceLogos.map((item, index) => {
    const fallback = HOMEPAGE_FALLBACK.logos[index] || HOMEPAGE_FALLBACK.logos[0];
    const type: 'image' | 'text' = item?.type === 'image' ? 'image' : 'text';
    const fallbackImage = 'imageUrl' in fallback && typeof fallback.imageUrl === 'string'
      ? fallback.imageUrl
      : HOMEPAGE_FALLBACK.carousels[0].imageUrl;
    const imageUrl = typeof (item as { imageUrl?: unknown } | undefined)?.imageUrl === 'string'
      ? (item as { imageUrl?: string }).imageUrl
      : undefined;

    return {
      id: String(item?.id || fallback.id),
      name: normalizeText(item?.name, fallback.name),
      type,
      imageUrl: type === 'image'
        ? normalizeImageUrl(imageUrl, fallbackImage)
        : undefined,
      text: type === 'text'
        ? normalizeText(item?.text, fallback.text || '')
        : undefined,
      textStyle: item?.textStyle || fallback.textStyle,
      linkUrl: normalizeLinkUrl(item?.linkUrl, fallback.linkUrl || '/'),
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : fallback.enabled,
    };
  });

  return {
    ...rawConfig,
    carousels,
    logos,
    skinOptions: Array.isArray(rawConfig?.skinOptions) ? rawConfig.skinOptions : [],
    footerInfo: {
      copyright: normalizeText(rawConfig?.footerInfo?.copyright, HOMEPAGE_FALLBACK.footerInfo.copyright),
      icpNumber: rawConfig?.footerInfo?.icpNumber || HOMEPAGE_FALLBACK.footerInfo.icpNumber,
      publicSecurityNumber: rawConfig?.footerInfo?.publicSecurityNumber || HOMEPAGE_FALLBACK.footerInfo.publicSecurityNumber,
      otherInfo: rawConfig?.footerInfo?.otherInfo || HOMEPAGE_FALLBACK.footerInfo.otherInfo,
    },
  };
}

export function sanitizeHomepageConfigForAdmin(rawConfig: HomepageConfig | null | undefined): HomepageConfig {
  const carousels = Array.isArray(rawConfig?.carousels)
    ? rawConfig.carousels.map((item, index) => ({
      id: String(item?.id || `carousel-${index + 1}`),
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
      imageUrl: normalizeImageUrl(item?.imageUrl, ''),
      linkUrl: String(item?.linkUrl || '').trim(),
      order: typeof item?.order === 'number' ? item.order : index,
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : true,
    }))
    : [];

  const logos: LogoItem[] = Array.isArray(rawConfig?.logos)
    ? rawConfig.logos.map((item, index): LogoItem => ({
      id: String(item?.id || `logo-${index + 1}`),
      name: String(item?.name || '').trim(),
      type: item?.type === 'image' ? 'image' : 'text',
      imageUrl: item?.type === 'image' ? normalizeImageUrl(item?.imageUrl, '') : undefined,
      text: item?.type === 'image' ? undefined : String(item?.text || '').trim(),
      textStyle: item?.textStyle || {
        fontSize: 'xl',
        fontWeight: 'bold',
      },
      linkUrl: String(item?.linkUrl || '').trim(),
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : true,
    }))
    : [];

  return {
    carousels,
    logos,
    skinOptions: Array.isArray(rawConfig?.skinOptions) ? rawConfig.skinOptions : [],
    footerInfo: {
      copyright: String(rawConfig?.footerInfo?.copyright || '').trim(),
      icpNumber: String(rawConfig?.footerInfo?.icpNumber || '').trim(),
      publicSecurityNumber: String(rawConfig?.footerInfo?.publicSecurityNumber || '').trim(),
      otherInfo: String(rawConfig?.footerInfo?.otherInfo || '').trim(),
    },
  };
}

export { normalizeLinkUrl as normalizeHomepageLinkUrl };
