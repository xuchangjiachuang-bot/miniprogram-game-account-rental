/**
 * Mini program account data transformer.
 */

const DEFAULT_ACCOUNT_IMAGE = '/images/default-account.png';

const rankMap = {
  none: '无段位',
  unranked: '无段位',
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  blackeagle: '黑鹰',
  peak: '巅峰',
  master: '大师',
  king: '王者',
};

const loginMethodMap = {
  wechat: '微信扫码',
  qq_scan: 'QQ扫码',
  qq: 'QQ账号密码',
  qq_password: 'QQ账号密码',
  password: 'Steam账号密码',
  steam: 'Steam账号密码',
};

const platformMap = {
  wegame: 'Wegame',
  steam: 'Steam',
  qq: 'QQ',
  wechat: '微信',
};

const statusMap = {
  available: '可出租',
  rented: '已出租',
  renting: '租赁中',
  locked: '锁定中',
  deleted: '已删除',
  pending: '审核中',
  off_shelf: '已下架',
  archived: '已归档',
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimZeroNumber(value) {
  const numeric = toNumber(value, 0);
  if (!numeric) return '0';
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatMoney(value) {
  return toNumber(value, 0).toFixed(2);
}

function formatCoinsDisplay(value) {
  const numeric = toNumber(value, 0);
  if (numeric <= 0) return '-';
  return `${trimZeroNumber(numeric)}M`;
}

function sanitizeImageSource(src) {
  if (!src) return '';
  const value = String(src).trim();
  if (!value) return '';

  const lowerValue = value.toLowerCase();
  if (value.includes('<') || value.includes('>')) return '';
  if (lowerValue.includes('javascript:')) return '';
  if (lowerValue.includes('data:text/html')) return '';
  if (lowerValue.includes('<url>')) return '';
  if (lowerValue.includes('undefined') || lowerValue.includes('null')) return '';
  if (lowerValue.endsWith('.html') || lowerValue.endsWith('.htm')) return '';

  const supportedPrefixes = ['http://', 'https://', '/', 'wxfile://', 'cloud://', 'data:image/'];
  return supportedPrefixes.some((prefix) => lowerValue.startsWith(prefix)) ? value : '';
}

function normalizeImages(account = {}) {
  const candidates = [];

  if (Array.isArray(account.images)) candidates.push(...account.images);
  if (Array.isArray(account.screenshots)) candidates.push(...account.screenshots);
  if (account.coverImage) candidates.push(account.coverImage);
  if (account.cover_image) candidates.push(account.cover_image);
  if (account.imageUrl) candidates.push(account.imageUrl);

  const images = candidates
    .map((item) => sanitizeImageSource(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);

  return images.length > 0 ? images : [DEFAULT_ACCOUNT_IMAGE];
}

function getRankText(rank) {
  const key = String(rank || '').toLowerCase();
  return rankMap[key] || rank || '无段位';
}

function getLoginMethodText(loginMethod) {
  const key = String(loginMethod || '').toLowerCase();
  return loginMethodMap[key] || loginMethod || '未知登录方式';
}

function getStatusText(status) {
  return statusMap[status] || status || '未知状态';
}

function getPlatformText(platform) {
  const key = String(platform || '').toLowerCase();
  return platformMap[key] || platform || '未知平台';
}

function getSafeboxText(safeboxCount) {
  const count = toNumber(safeboxCount, 0);
  if (count === 4) return '2x2';
  if (count === 6) return '2x3';
  if (count === 9) return '3x3';
  if (count > 0) return `${count}格`;
  return '-';
}

function getRentalDescription(duration, explicitText) {
  if (explicitText) {
    const text = String(explicitText).trim();
    if (text) return text;
  }

  const hours = toNumber(duration, 0);
  if (hours <= 0) return '-';
  if (hours < 24) return `${trimZeroNumber(hours)}小时`;

  const days = hours / 24;
  if (Number.isInteger(days)) return `${days}天（${trimZeroNumber(hours)}小时）`;
  return `${trimZeroNumber(days)}天（${trimZeroNumber(hours)}小时）`;
}

function buildTags(account = {}) {
  const tags = Array.isArray(account.tags) ? account.tags.filter(Boolean).map((item) => String(item).trim()) : [];
  const skinTier = account.skinTier || account.skin_tier || '';

  if (tags.length === 0 && skinTier) {
    return String(skinTier)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return tags;
}

function buildFullTitle(account = {}, customAttributes = {}) {
  const existingTitle = String(account.title || account.account_name || '').trim();
  if (existingTitle) return existingTitle;

  const parts = [];
  const coinsM = toNumber(account.coinsM || account.coins_million, 0);
  const safeboxCount = toNumber(account.safeboxCount || account.safebox_count, 0);
  const staminaValue = toNumber(account.staminaValue || account.stamina_value, 0);
  const energyValue = toNumber(account.energyValue || account.energy_value, 0);

  if (coinsM > 0) parts.push(`${trimZeroNumber(coinsM)}M 哈夫币`);
  if (safeboxCount > 0) parts.push(`${getSafeboxText(safeboxCount)} 安全箱`);
  if (staminaValue > 0) parts.push(`${staminaValue}体力`);
  if (energyValue > 0) parts.push(`${energyValue}负重`);
  if (customAttributes.rank) parts.push(getRankText(customAttributes.rank));

  return parts.length > 0 ? parts.join(' | ') : '游戏账号';
}

function transformAccount(account) {
  if (!account) return null;

  const customAttributes = account.customAttributes || {};
  const coinsValue = toNumber(account.coinsM || account.coins_million, 0);
  const ratioValue = toNumber(account.rentalRatio || account.rental_ratio, 35);
  const safeboxCount = toNumber(account.safeboxCount || account.safebox_count, 0);
  const staminaLevel = toNumber(account.staminaValue || account.stamina_value || customAttributes.staminaLevel, 0);
  const loadLevel = toNumber(account.energyValue || account.energy_value || customAttributes.loadLevel, 0);
  const rentalHours = toNumber(
    account.rentalHours || account.rent_hours || account.rental_duration_hours || (toNumber(account.rentalDays || account.rental_days, 0) * 24),
    0,
  );
  const rentalPriceValue = toNumber(account.accountValue || account.recommendedRental || account.rentalPrice || account.rental_price, 0);
  const depositValue = toNumber(account.deposit || account.deposit_amount, 0);
  const totalPriceValue = toNumber(account.totalPrice || account.total_price, rentalPriceValue + depositValue);
  const tags = buildTags(account);
  const images = normalizeImages(account);
  const province = String(customAttributes.province || account.province || (account.region && account.region.province) || '').trim();
  const city = String(customAttributes.city || account.city || (account.region && account.region.city) || '').trim();
  const rankKey = String(customAttributes.rank || account.rank || 'none').trim().toLowerCase();
  const loginMethodKey = String(customAttributes.loginMethod || account.loginMethod || account.login_method || '').trim().toLowerCase();
  const description = String(account.description || customAttributes.remark || '').trim();
  const status = account.status || 'available';
  const startTime = String(customAttributes.startTime || account.startTime || '').trim();
  const endTime = String(customAttributes.endTime || account.endTime || '').trim();
  const platformKey = String(customAttributes.platform || account.platform || '').trim().toLowerCase();

  return {
    id: account.id || account.accountId || account.account_id,
    account_id: account.accountId || account.account_id || account.id || '',
    seller_id: account.sellerId || account.seller_id || '',
    account_name: String(account.account_name || account.title || '').trim() || '游戏账号',
    title: String(account.title || account.account_name || '').trim() || '游戏账号',
    fullTitle: buildFullTitle(account, customAttributes),
    coinsValue,
    coins_display: formatCoinsDisplay(coinsValue),
    ratioValue,
    ratio_display: ratioValue > 0 ? `1:${Math.round(ratioValue)}` : '1:35',
    safeboxCount,
    safebox: getSafeboxText(safeboxCount),
    stamina_level: staminaLevel || '-',
    load_level: loadLevel || '-',
    account_level: toNumber(customAttributes.accountLevel || account.accountLevel || account.account_level, 0),
    rank: rankKey,
    rankKey,
    rank_display: getRankText(rankKey),
    kd: trimZeroNumber(customAttributes.kd || account.kd || 0),
    awmBullets: String(customAttributes.awmBullets || account.awmBullets || account.awm_bullets || '').trim(),
    level6Armor: String(customAttributes.level6Armor || account.level6Armor || account.level_6_armor || '').trim(),
    level6Helmet: String(customAttributes.level6Helmet || account.level6Helmet || account.level_6_helmet || '').trim(),
    platformKey,
    platformText: getPlatformText(platformKey),
    login_method: getLoginMethodText(loginMethodKey),
    loginMethodKey,
    region: {
      province: province || '-',
      city: city || '',
    },
    province,
    city,
    regionText: city ? `${province} ${city}`.trim() : (province || '不限地区'),
    tags,
    skins: tags,
    tagPreview: tags.slice(0, 3),
    moreTagCount: Math.max(0, tags.length - 3),
    images,
    screenshots: images,
    actual_rental: formatMoney(rentalPriceValue),
    actualRentalValue: rentalPriceValue,
    deposit: formatMoney(depositValue),
    depositValue,
    total_price: formatMoney(totalPriceValue),
    totalPriceValue,
    rental_description: getRentalDescription(rentalHours, account.rentalDescription || account.rental_description),
    rental_duration: rentalHours,
    rental_days: rentalHours > 0 ? Number((rentalHours / 24).toFixed(2)) : 0,
    rental_hours: rentalHours,
    availableTimeText: startTime && endTime ? `${startTime} - ${endTime}` : '',
    description: description || '卖家暂未补充描述，可先查看属性和价格后再决定。',
    status,
    statusText: getStatusText(status),
    view_count: toNumber(account.viewCount || account.view_count, 0),
    trade_count: toNumber(account.tradeCount || account.trade_count, 0),
    created_at: account.createdAt || account.created_at || '',
    updated_at: account.updatedAt || account.updated_at || '',
    listed_at: account.listedAt || account.listed_at || account.createdAt || account.created_at || '-',
    audit_status: account.auditStatus || account.audit_status || '',
    is_deleted: Boolean(account.isDeleted || account.is_deleted),
  };
}

function transformAccountList(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.map((account) => transformAccount(account)).filter(Boolean);
}

module.exports = {
  DEFAULT_ACCOUNT_IMAGE,
  sanitizeImageSource,
  transformAccount,
  transformAccountList,
  getRankText,
  getLoginMethodText,
  getStatusText,
  getPlatformText,
  getRentalDescription,
  getSafeboxText,
  rankMap,
  loginMethodMap,
  statusMap,
};
