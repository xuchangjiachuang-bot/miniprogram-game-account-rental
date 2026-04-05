/**
 * Mini program account data transformer.
 */

const rankMap = {
  none: '无段位',
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  blackeagle: '黑鹰',
  peak: '巅峰',
};

const loginMethodMap = {
  wechat: '微信扫码',
  qq: 'QQ 账号密码',
  password: 'Steam 账号密码',
  steam: 'Steam 账号密码',
};

const statusMap = {
  available: '可出租',
  rented: '已租出',
  renting: '租赁中',
  locked: '锁定中',
  deleted: '已删除',
  pending: '审核中',
  off_shelf: '已下架',
};

function formatMoney(value) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return '0.00';
  return amount.toFixed(2);
}

function normalizeImages(account = {}) {
  const candidates = [];

  if (Array.isArray(account.images)) candidates.push(...account.images);
  if (Array.isArray(account.screenshots)) candidates.push(...account.screenshots);
  if (account.coverImage) candidates.push(account.coverImage);
  if (account.cover_image) candidates.push(account.cover_image);
  if (account.imageUrl) candidates.push(account.imageUrl);

  const deduped = candidates.filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
  return deduped.length > 0 ? deduped : ['/images/default-account.png'];
}

function getRankText(rank) {
  return rankMap[rank] || rank || '无段位';
}

function getLoginMethodText(loginMethod) {
  return loginMethodMap[loginMethod] || loginMethod || '未知方式';
}

function getStatusText(status) {
  return statusMap[status] || status || '未知状态';
}

function getRentalDescription(duration) {
  const value = Number(duration || 0);
  if (!Number.isFinite(value) || value <= 0) return '-';

  if (value >= 24) {
    const days = Math.floor(value / 24);
    const hours = value % 24;
    return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
  }

  return `${value}小时`;
}

function buildFullTitle(account = {}, customAttributes = {}) {
  const parts = [];

  const coinsM = Number(account.coinsM || account.coins_million || 0);
  if (coinsM > 0) parts.push(`${coinsM}M 哈夫币`);

  const safeboxCount = Number(account.safeboxCount || account.safebox_count || 0);
  if (safeboxCount > 0) parts.push(`${safeboxCount} 格保险箱`);

  const staminaValue = Number(account.staminaValue || account.stamina_value || 0);
  if (staminaValue > 0) parts.push(`${staminaValue} 体力`);

  const energyValue = Number(account.energyValue || account.energy_value || 0);
  if (energyValue > 0) parts.push(`${energyValue} 负重`);

  if (customAttributes.rank) parts.push(getRankText(customAttributes.rank));
  if (customAttributes.kd) parts.push(`KD ${customAttributes.kd}`);
  if (Array.isArray(account.tags) && account.tags.length > 0) parts.push(account.tags[0]);

  return parts.length > 0 ? parts.join(' | ') : (account.title || account.account_name || '游戏账号');
}

function transformAccount(account) {
  if (!account) return null;

  const customAttributes = account.customAttributes || {};
  const coinsM = Number(account.coinsM || account.coins_million || 0);
  const ratioValue = Number(account.rentalRatio || account.rental_ratio || 35);
  const safeboxCount = Number(account.safeboxCount || account.safebox_count || 0);
  const staminaLevel = Number(account.staminaValue || account.stamina_value || customAttributes.staminaLevel || 0);
  const loadLevel = Number(account.energyValue || account.energy_value || customAttributes.loadLevel || 0);
  const rentalHours = Number(account.rentalHours || account.rent_hours || account.rental_duration_hours || 0);
  const images = normalizeImages(account);
  const rentalPrice = Number(account.accountValue || account.recommendedRental || account.rentalPrice || account.rental_price || 0);
  const deposit = Number(account.deposit || account.deposit_amount || 0);
  const totalPrice = Number(account.totalPrice || account.total_price || (rentalPrice + deposit));
  const tags = Array.isArray(account.tags) ? account.tags.filter(Boolean) : [];
  const regionProvince = customAttributes.province || account.province || account.region?.province || '';
  const regionCity = customAttributes.city || account.city || account.region?.city || '';

  return {
    id: account.id || account.accountId || account.account_id,
    account_id: account.accountId || account.account_id || account.id,
    account_name: account.title || account.account_name || '游戏账号',
    title: account.title || account.account_name || '游戏账号',
    fullTitle: buildFullTitle(account, customAttributes),
    coins_display: coinsM > 0 ? `${coinsM}M` : '-',
    ratio_display: ratioValue > 0 ? `1:${Math.round(ratioValue)}` : '1:35',
    safebox: safeboxCount > 0 ? `${safeboxCount} 格` : '-',
    stamina_level: staminaLevel || '-',
    load_level: loadLevel || '-',
    account_level: customAttributes.accountLevel || account.accountLevel || account.account_level || 0,
    rank: customAttributes.rank || account.rank || 'none',
    rank_display: getRankText(customAttributes.rank || account.rank),
    kd: customAttributes.kd || account.kd || 0,
    login_method: getLoginMethodText(customAttributes.loginMethod || account.loginMethod || account.login_method),
    loginMethod: customAttributes.loginMethod || account.loginMethod || account.login_method || '',
    region: {
      province: regionProvince || '-',
      city: regionCity || '-',
    },
    regionText: regionCity || regionProvince || '不限地区',
    skins: tags,
    tags,
    tagPreview: tags.slice(0, 3),
    moreTagCount: Math.max(0, tags.length - 3),
    images,
    screenshots: images,
    actual_rental: formatMoney(rentalPrice),
    deposit: formatMoney(deposit),
    total_price: formatMoney(totalPrice),
    rental_description: getRentalDescription(rentalHours),
    rental_duration: rentalHours,
    rental_days: rentalHours > 0 ? Number((rentalHours / 24).toFixed(2)) : 0,
    rental_hours: rentalHours,
    description: account.description || '',
    status: account.status || 'available',
    statusText: getStatusText(account.status || 'available'),
    seller_id: account.sellerId || account.seller_id || '',
    view_count: Number(account.viewCount || account.view_count || 0),
    trade_count: Number(account.tradeCount || account.trade_count || 0),
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
  transformAccount,
  transformAccountList,
  getRankText,
  getLoginMethodText,
  getStatusText,
  getRentalDescription,
  rankMap,
  loginMethodMap,
  statusMap,
};
