# 小程序深度优化方案

## 一、功能对比分析

### 1.1 账号卡片显示字段对比

#### 网页版显示字段（完整）
```
图片区域：
- 多图轮播（支持左右切换）
- 图片指示器
- 标签（tags）

标题区域：
- 自动构建的账号标题（包含所有重要属性）

平台信息：
- 平台标签（platform/login_method）

核心属性：
- 哈夫币（coins_display）
- 比例（ratio_display）
- 安全箱（safebox）
- 体力/负重（stamina_level/load_level）
- 账号等级（account_level）
- 段位（rank）
- KD值（kd）
- 地区（region.city）

皮肤信息：
- 皮肤标签（skins，最多显示3个，+N）

价格信息：
- 租金（actual_rental）
- 押金（deposit）
- 租期（rental_duration）
- 总价（total_price）

特殊属性：
- AWM子弹（awmBullets）
- 6甲（level6Armor）
- 6头（level6Helmet）
```

#### 小程序版显示字段（不完整）
```
图片区域：
- 单图
- 状态标签

标题区域：
- 简单账号名（account_name）

信息卡片：
- 哈夫币（coins_display）
- 比例（ratio_display）

属性行：
- 安全箱（safebox）
- 账号等级（account_level）
- 段位（rank）

价格区域：
- 总价（total_price）
```

### 1.2 缺失字段清单

❌ **缺失的字段**：
1. 平台标签（platform/login_method）
2. KD值（kd）
3. 地区（region.city）
4. 皮肤显示（skins）
5. 租期（rental_duration）
6. 租金/押金分离显示
7. AWM子弹（awmBullets）
8. 6甲（level6Armor）
9. 6头（level6Helmet）
10. 标签（tags）
11. 多图轮播功能

### 1.3 显示文案对比

#### 网页版文案
```
- "哈夫币" → 显示数值（如 "100M"）
- "比例" → 显示数值（如 "1:35"）
- "安全箱" → 显示格式（如 "2×2"）
- "体力/负重" → 显示格式（如 "6/7"）
- "等级" → 显示格式（如 "Lv.30"）
- "段位" → 映射显示（如 "青铜"、"白银"）
- "KD" → 显示数值
- "租金/押金" → 分离显示
- "租期" → 显示描述（如 "1天"）
- "总价" → 显示数值
```

#### 小程序版文案
```
- "哈夫币" → 显示数值（如 "100M"）✅
- "比例" → 显示数值（如 "1:35"）✅
- "安全箱" → 显示格式（如 "2×2"）✅
- "等级" → 显示格式（如 "Lv.30"）✅
- "段位" → 显示原始值❌（应该映射）
- "总价" → 显示数值✅
```

## 二、优化方案

### 2.1 账号卡片优化

#### 目标
实现与网页版一致的账号卡片显示，包含所有重要字段。

#### 实施步骤

**步骤1：更新小程序首页WXML**

在账号卡片中添加缺失的字段：

```xml
<view class="account-card" wx:for="{{displayAccounts}}" wx:key="id">
  <!-- 图片区域 -->
  <view class="card-image">
    <image class="card-img" src="{{item.images[0]}}" mode="aspectFill" />
    <!-- 平台标签 -->
    <view class="platform-badge">{{item.login_method}}</view>
    <!-- 标签 -->
    <view class="tags-row">
      <text class="tag" wx:for="{{item.tags}}" wx:key="index">{{item}}</text>
    </view>
  </view>

  <!-- 内容区域 -->
  <view class="card-content">
    <!-- 自动构建的标题 -->
    <view class="card-title">{{item.fullTitle}}</view>

    <!-- 核心属性 -->
    <view class="info-row">
      <view class="info-box coins">
        <text class="info-label">哈夫币</text>
        <text class="info-value">{{item.coins_display}}</text>
      </view>
      <view class="info-box ratio">
        <text class="info-label">比例</text>
        <text class="info-value">{{item.ratio_display}}</text>
      </view>
    </view>

    <!-- 属性行 -->
    <view class="attributes-row">
      <view class="attribute">
        <text class="attr-label">安全箱</text>
        <text class="attr-value">{{item.safebox}}</text>
      </view>
      <view class="attribute">
        <text class="attr-label">体力/负重</text>
        <text class="attr-value">{{item.stamina_level}}/{{item.load_level}}</text>
      </view>
      <view class="attribute">
        <text class="attr-label">等级</text>
        <text class="attr-value">Lv.{{item.account_level}}</text>
      </view>
      <view class="attribute">
        <text class="attr-label">段位</text>
        <text class="attr-value">{{item.rank_display}}</text>
      </view>
    </view>

    <!-- KD和地区 -->
    <view class="kd-region-row">
      <text class="kd-text">KD: {{item.kd}}</text>
      <text class="region-text">{{item.region.city}}</text>
    </view>

    <!-- 皮肤标签 -->
    <view class="skins-row" wx:if="{{item.skins.length > 0}}">
      <text class="skin-tag" wx:for="{{item.skins.slice(0,3)}}" wx:key="index">{{item}}</text>
      <text class="skin-more" wx:if="{{item.skins.length > 3}}">+{{item.skins.length - 3}}</text>
    </view>

    <!-- 价格信息 -->
    <view class="price-row">
      <view class="price-box">
        <text class="price-label">租金</text>
        <text class="price-value">¥{{item.actual_rental}}</text>
      </view>
      <view class="price-box">
        <text class="price-label">押金</text>
        <text class="price-value">¥{{item.deposit}}</text>
      </view>
      <view class="price-box">
        <text class="price-label">总价</text>
        <text class="price-value total">¥{{item.total_price}}</text>
      </view>
    </view>

    <!-- 租期 -->
    <view class="rental-duration">
      <text class="duration-label">租期</text>
      <text class="duration-value">{{item.rental_description}}</text>
    </view>
  </view>
</view>
```

**步骤2：更新小程序首页JS**

添加数据转换和文案映射逻辑：

```javascript
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

// 构建完整标题
const buildFullTitle = (account) => {
  const parts = [];
  if (account.coins_display) parts.push(`哈夫币${account.coins_display}`);
  if (account.safebox) {
    const safeboxLevel = account.safebox === '3×3' ? '顶级' : '';
    parts.push(`${safeboxLevel}安全箱(${account.safebox})`);
  }
  if (account.stamina_level) parts.push(`${account.stamina_level}体力`);
  if (account.load_level) parts.push(`${account.load_level}负重`);
  if (account.rank) parts.push(rankMap[account.rank] || account.rank);
  return parts.join(' | ');
};

// 计算租期描述
const getRentalDescription = (duration) => {
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
};

// 在loadAccounts中转换数据
const transformAccount = (account) => {
  const customAttributes = account.customAttributes || {};
  return {
    ...account,
    fullTitle: buildFullTitle(account),
    rank_display: rankMap[account.rank] || account.rank,
    rental_description: getRentalDescription(account.rental_duration),
    login_method: customAttributes.loginMethod === 'qq' ? 'QQ账号密码' :
                  customAttributes.loginMethod === 'password' ? 'Steam账号密码' :
                  customAttributes.loginMethod === 'wechat' ? '微信扫码' : '未知',
    stamina_level: account.staminaValue || 0,
    load_level: account.energyValue || 0,
    account_level: customAttributes.accountLevel || 0,
    kd: customAttributes.kd || 0,
    region: {
      province: customAttributes.province || '未知',
      city: customAttributes.city || '未知'
    },
    skins: account.tags || [],
    actual_rental: parseFloat(account.accountValue) || 0,
    deposit: parseFloat(account.deposit) || 0,
    total_price: (parseFloat(account.accountValue) || 0) + (parseFloat(account.deposit) || 0),
    rental_duration: account.rentalDays ? parseFloat(account.rentalDays) :
                     account.rentalHours ? parseFloat(account.rentalHours) / 24 : 1
  };
};
```

### 2.2 筛选器优化

#### 问题分析
当前小程序的筛选器与网页版基本一致，但需要检查API参数是否正确传递。

#### 优化步骤

**步骤1：检查筛选参数映射**

小程序的`buildFilterParams`方法需要正确映射参数：

```javascript
buildFilterParams() {
  const { filters, selectedSkins, searchQuery } = this.data;
  const params = {};

  // 搜索关键词
  if (searchQuery) {
    params.keyword = searchQuery;
  }

  // 平台·上号方式
  if (filters.platformIndex > 0) {
    const platform = this.data.platformOptions[filters.platformIndex];
    if (platform.includes('微信')) params.loginMethod = 'wechat';
    else if (platform.includes('QQ')) params.loginMethod = 'qq';
    else if (platform.includes('Steam')) params.loginMethod = 'password';
  }

  // 哈夫币范围
  if (filters.minCoins) params.minCoins = filters.minCoins;
  if (filters.maxCoins) params.maxCoins = filters.maxCoins;

  // 段位（需要映射）
  if (filters.rankIndex > 0) {
    const rankText = this.data.rankOptions[filters.rankIndex];
    params.rank = rankText;
  }

  // 安全箱
  if (filters.safeboxIndex > 0) {
    params.safebox = this.data.safeboxOptions[filters.safeboxIndex];
  }

  // 体力等级
  if (filters.staminaIndex > 0) {
    params.staminaLevel = this.data.staminaOptions[filters.staminaIndex].replace('级', '');
  }

  // 负重等级
  if (filters.loadIndex > 0) {
    params.loadLevel = this.data.loadOptions[filters.loadIndex].replace('级', '');
  }

  // 地区
  if (filters.provinceIndex > 0) {
    params.province = this.data.provinceOptions[filters.provinceIndex];
  }

  // 租金范围
  if (filters.minRental) params.minRental = filters.minRental;
  if (filters.maxRental) params.maxRental = filters.maxRental;

  // 押金范围
  if (filters.minDeposit) params.minDeposit = filters.minDeposit;
  if (filters.maxDeposit) params.maxDeposit = filters.maxDeposit;

  // 总价范围
  if (filters.minTotal) params.minTotal = filters.minTotal;
  if (filters.maxTotal) params.maxTotal = filters.maxTotal;

  // 皮肤
  if (selectedSkins.length > 0) {
    params.skins = selectedSkins.join(',');
  }

  return params;
}
```

**步骤2：检查后端API参数支持**

需要检查`/api/accounts`接口是否支持这些参数。

### 2.3 文案统一

#### 需要统一的文案

| 字段 | 小程序当前文案 | 网页版文案 | 统一文案 |
|------|--------------|-----------|---------|
| 段位 | 原始值（如 'bronze'） | 映射值（如 '青铜'） | 映射值 |
| 平台 | 无 | '微信扫码'/'QQ账号密码' | 添加显示 |
| 租期 | 无 | '1天'/'1天2小时' | 添加显示 |
| 租金/押金 | '总价' | '租金/押金'分离 | 分离显示 |
| 安全箱 | '1×2' | '1×2' | 统一格式 |

## 三、实施优先级

### 高优先级（立即修复）
1. ✅ 添加段位映射显示
2. ✅ 添加平台标签显示
3. ✅ 添加租金/押金分离显示
4. ✅ 添加租期显示
5. ✅ 优化标题显示（自动构建）

### 中优先级（重要功能）
6. ✅ 添加KD值显示
7. ✅ 添加地区显示
8. ✅ 添加皮肤标签显示
9. ✅ 优化数据转换逻辑
10. ✅ 检查筛选器API参数

### 低优先级（优化体验）
11. 添加多图轮播功能
12. 添加图片指示器
13. 添加AWM子弹、6甲、6头特殊属性显示

## 四、下一步行动

### 立即执行
1. 更新小程序首页JS，添加数据转换逻辑
2. 更新小程序首页WXML，添加缺失字段显示
3. 添加样式文件，优化卡片布局

### 测试验证
1. 测试账号卡片显示是否正确
2. 测试筛选器是否正常工作
3. 对比网页版，确保文案一致

### 文档更新
1. 更新小程序使用文档
2. 更新API文档
3. 更新功能对比文档
