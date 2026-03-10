// utils/data-transformer.js
/**
 * 数据转换工具
 * 用于统一处理API返回的数据，转换为前端需要的格式
 */

// 段位映射
const rankMap = {
  'none': '无',
  'bronze': '青铜',
  'silver': '白银',
  'gold': '黄金',
  'platinum': '铂金',
  'diamond': '钻石',
  'blackeagle': '黑鹰',
  'peak': '巅峰'
};

// 登录方式映射
const loginMethodMap = {
  'wechat': '微信扫码',
  'qq': 'QQ账号密码',
  'password': 'Steam账号密码'
};

// 账号状态映射
const statusMap = {
  'available': '可用',
  'rented': '已租',
  'locked': '锁定',
  'deleted': '已删除',
  'pending': '审核中'
};

/**
 * 转换单个账号数据
 */
function transformAccount(account) {
  if (!account) return null;

  const customAttributes = account.customAttributes || {};

  // 构建完整标题
  const titleParts = [];
  if (account.coinsM) {
    titleParts.push(`哈夫币${account.coinsM}M`);
  }
  if (account.safeboxCount) {
    const safeboxMap = { 4: '2×2', 6: '2×3', 9: '3×3' };
    const safeboxStr = safeboxMap[account.safeboxCount] || `${account.safeboxCount}格`;
    const safeboxLevel = account.safeboxCount === 9 ? '顶级' : '';
    titleParts.push(`${safeboxLevel}安全箱(${safeboxStr})`);
  }
  if (account.staminaValue) {
    titleParts.push(`${account.staminaValue}体力`);
  }
  if (account.energyValue) {
    titleParts.push(`${account.energyValue}负重`);
  }
  if (customAttributes.rank) {
    titleParts.push(rankMap[customAttributes.rank] || customAttributes.rank);
  }
  if (customAttributes.kd) {
    titleParts.push(`KD ${customAttributes.kd}`);
  }
  if (account.tags && account.tags.length > 0) {
    titleParts.push(...account.tags);
  }

  // 构建安全箱显示
  const safeboxMap = { 4: '2×2', 6: '2×3', 9: '3×3' };
  const safeboxDisplay = safeboxMap[account.safeboxCount] || '未知';

  // 计算租期描述
  let rentalDescription = '-';
  const rentalDays = account.rentalDays ? parseFloat(account.rentalDays) : 0;
  const rentalHours = account.rentalHours ? parseFloat(account.rentalHours) : 0;
  if (rentalDays > 0) {
    const days = Math.floor(rentalDays);
    const hours = Math.round((rentalDays - days) * 24);
    if (hours > 0) {
      rentalDescription = `${days}天${hours}小时`;
    } else {
      rentalDescription = `${days}天`;
    }
  } else if (rentalHours > 0) {
    rentalDescription = `${rentalHours}小时`;
  }

  // 计算价格
  const actualRental = parseFloat(account.accountValue || account.recommendedRental || 0);
  const deposit = parseFloat(account.deposit || 0);
  const totalPrice = actualRental + deposit;

  // 处理图片
  let images = [];
  if (Array.isArray(account.screenshots)) {
    images = account.screenshots;
  } else if (account.screenshots) {
    images = [account.screenshots];
  }

  return {
    id: account.id,
    account_id: account.accountId,
    account_name: account.title,
    fullTitle: titleParts.join(' | '),
    coins_display: account.coinsM ? `${account.coinsM}M` : '-',
    ratio_display: account.rentalRatio ? `1:${Math.round(parseFloat(account.rentalRatio))}` : '1:35',
    safebox: safeboxDisplay,
    stamina_level: account.staminaValue || 0,
    load_level: account.energyValue || 0,
    account_level: customAttributes.accountLevel || 0,
    rank: customAttributes.rank || 'none',
    rank_display: rankMap[customAttributes.rank] || customAttributes.rank || '无',
    kd: customAttributes.kd || 0,
    awmBullets: customAttributes.awmBullets || customAttributes.awm_bullets || 0,
    level6Armor: customAttributes.level6Armor || customAttributes.level_6_armor || 0,
    level6Helmet: customAttributes.level6Helmet || customAttributes.level_6_helmet || 0,
    login_method: loginMethodMap[customAttributes.loginMethod] || '未知',
    loginMethod: customAttributes.loginMethod || 'unknown',
    region: {
      province: customAttributes.province || '未知',
      city: customAttributes.city || '未知'
    },
    skins: account.tags || [],
    tags: account.tags || [],
    images: images,
    screenshots: images, // 保留原始字段
    actual_rental: actualRental.toFixed(2),
    deposit: deposit.toFixed(2),
    total_price: totalPrice.toFixed(2),
    rental_description: rentalDescription,
    rental_duration: rentalDays > 0 ? rentalDays : rentalHours / 24,
    rental_days: rentalDays,
    rental_hours: rentalHours,
    description: account.description || '',
    status: account.status || 'unknown',
    statusText: statusMap[account.status] || account.status || '未知',
    seller_id: account.sellerId,
    view_count: account.viewCount || 0,
    trade_count: account.tradeCount || 0,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
    listed_at: account.listedAt,
    audit_status: account.auditStatus,
    is_deleted: account.isDeleted || false
  };
}

/**
 * 转换账号列表
 */
function transformAccountList(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.map(account => transformAccount(account));
}

/**
 * 获取段位文本
 */
function getRankText(rank) {
  return rankMap[rank] || rank || '无';
}

/**
 * 获取登录方式文本
 */
function getLoginMethodText(loginMethod) {
  return loginMethodMap[loginMethod] || loginMethod || '未知';
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  return statusMap[status] || status || '未知';
}

/**
 * 计算租期描述
 */
function getRentalDescription(duration) {
  if (!duration) return '-';
  if (duration >= 1) {
    const days = Math.floor(duration);
    const remainingHours = (duration - days) * 24;
    if (remainingHours === 0) return `${days}天`;
    if (remainingHours >= 1) return `${days}天${Math.floor(remainingHours)}小时`;
    return `${days}天`;
  } else {
    const hours = Math.floor(duration * 24);
    return `${hours}小时`;
  }
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
  statusMap
};
