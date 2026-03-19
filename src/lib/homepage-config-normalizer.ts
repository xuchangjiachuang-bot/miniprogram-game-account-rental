import { defaultHomepageConfig, type HomepageConfig, type SkinOption } from '@/lib/config-types';

type CarouselItem = HomepageConfig['carousels'][number];
type LogoItem = HomepageConfig['logos'][number];

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

  return trimmed.includes('閿?')
    || trimmed.includes('锟?')
    || /[脙脗脨脩盲氓忙莽猫茅锚毛矛铆卯茂冒帽貌贸么玫枚酶霉煤没眉]/.test(trimmed)
    || /[盲赂氓忙莽茅猫锚茂录]/.test(trimmed);
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

function cloneDefaultSkinOptions() {
  return defaultHomepageConfig.skinOptions.map((item): SkinOption => ({ ...item }));
}

function normalizeSkinOptions(value: unknown): SkinOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    return cloneDefaultSkinOptions();
  }

  return value
    .map((item, index): SkinOption | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Partial<SkinOption>;
      const fallback = defaultHomepageConfig.skinOptions[index] || defaultHomepageConfig.skinOptions[0];
      const name = String(record.name || '').trim();

      if (!name) {
        return null;
      }

      return {
        id: String(record.id || fallback?.id || `skin-${index + 1}`),
        name,
        code: String(record.code || '').trim() || fallback?.code,
        iconUrl: String(record.iconUrl || '').trim(),
        category: String(record.category || '').trim(),
        enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
        createdAt: String(record.createdAt || '').trim() || fallback?.createdAt || new Date().toISOString(),
      };
    })
    .filter((item): item is SkinOption => Boolean(item));
}

function normalizeCarousels(value: HomepageConfig['carousels'] | undefined): HomepageConfig['carousels'] {
  const source = Array.isArray(value) ? value : defaultHomepageConfig.carousels;

  return source.map((item, index): CarouselItem => {
    const fallback = defaultHomepageConfig.carousels[index] || defaultHomepageConfig.carousels[0];

    return {
      id: String(item?.id || fallback.id),
      title: normalizeText(item?.title, fallback.title),
      description: normalizeText(item?.description, fallback.description),
      imageUrl: normalizeImageUrl(item?.imageUrl, fallback.imageUrl),
      linkUrl: normalizeLinkUrl(item?.linkUrl, fallback.linkUrl || '/'),
      order: typeof item?.order === 'number' ? item.order : fallback.order,
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : fallback.enabled,
    };
  });
}

function normalizeLogos(value: HomepageConfig['logos'] | undefined): HomepageConfig['logos'] {
  const source = Array.isArray(value) ? value : defaultHomepageConfig.logos;

  return source.map((item, index): LogoItem => {
    const fallback = defaultHomepageConfig.logos[index] || defaultHomepageConfig.logos[0];
    const type: 'image' | 'text' = item?.type === 'image' ? 'image' : 'text';
    const fallbackImage = fallback.type === 'image' && fallback.imageUrl
      ? fallback.imageUrl
      : defaultHomepageConfig.carousels[0].imageUrl;

    return {
      id: String(item?.id || fallback.id),
      name: normalizeText(item?.name, fallback.name),
      type,
      imageUrl: type === 'image'
        ? normalizeImageUrl(item?.imageUrl, fallbackImage)
        : undefined,
      text: type === 'text'
        ? normalizeText(item?.text, fallback.type === 'text' ? fallback.text || '' : '')
        : undefined,
      textStyle: item?.textStyle || fallback.textStyle,
      linkUrl: normalizeLinkUrl(item?.linkUrl, fallback.linkUrl || '/'),
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : fallback.enabled,
    };
  });
}

export function normalizeHomepageConfig(rawConfig: Partial<HomepageConfig> | null | undefined): HomepageConfig {
  return {
    ...defaultHomepageConfig,
    ...(rawConfig || {}),
    carousels: normalizeCarousels(rawConfig?.carousels),
    logos: normalizeLogos(rawConfig?.logos),
    skinOptions: normalizeSkinOptions(rawConfig?.skinOptions),
    footerInfo: {
      copyright: normalizeText(
        rawConfig?.footerInfo?.copyright,
        defaultHomepageConfig.footerInfo.copyright,
      ),
      icpNumber: String(rawConfig?.footerInfo?.icpNumber || defaultHomepageConfig.footerInfo.icpNumber || '').trim(),
      publicSecurityNumber: String(
        rawConfig?.footerInfo?.publicSecurityNumber
        || defaultHomepageConfig.footerInfo.publicSecurityNumber
        || '',
      ).trim(),
      otherInfo: String(rawConfig?.footerInfo?.otherInfo || defaultHomepageConfig.footerInfo.otherInfo || '').trim(),
    },
  };
}

export function sanitizeHomepageConfigForAdmin(
  rawConfig: Partial<HomepageConfig> | null | undefined,
): HomepageConfig {
  const normalized = normalizeHomepageConfig(rawConfig);

  return {
    carousels: normalized.carousels.map((item, index) => ({
      id: String(item.id || `carousel-${index + 1}`),
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      imageUrl: normalizeImageUrl(item.imageUrl, ''),
      linkUrl: String(item.linkUrl || '').trim(),
      order: typeof item.order === 'number' ? item.order : index,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    })),
    logos: normalized.logos.map((item, index) => ({
      id: String(item.id || `logo-${index + 1}`),
      name: String(item.name || '').trim(),
      type: item.type === 'image' ? 'image' : 'text',
      imageUrl: item.type === 'image' ? normalizeImageUrl(item.imageUrl, '') : undefined,
      text: item.type === 'image' ? undefined : String(item.text || '').trim(),
      textStyle: item.textStyle || { fontSize: 'xl', fontWeight: 'bold' },
      linkUrl: String(item.linkUrl || '').trim(),
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    })),
    skinOptions: normalizeSkinOptions(normalized.skinOptions),
    footerInfo: {
      copyright: String(normalized.footerInfo.copyright || '').trim(),
      icpNumber: String(normalized.footerInfo.icpNumber || '').trim(),
      publicSecurityNumber: String(normalized.footerInfo.publicSecurityNumber || '').trim(),
      otherInfo: String(normalized.footerInfo.otherInfo || '').trim(),
    },
  };
}

export { normalizeLinkUrl as normalizeHomepageLinkUrl };
