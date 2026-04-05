const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const config = require('../../utils/config.js');
const mockData = require('../../utils/mock-data.js');
const dataTransformer = require('../../utils/data-transformer.js');

const DEFAULT_ACCOUNT_IMAGE = dataTransformer.DEFAULT_ACCOUNT_IMAGE || '/images/default-account.png';

const PLATFORM_OPTIONS = [
  { label: '全部', value: '' },
  { label: '微信扫码', value: 'wechat' },
  { label: 'QQ扫码', value: 'qq_scan' },
  { label: 'QQ账号密码', value: 'qq' },
  { label: 'Steam账号密码', value: 'password' },
];

const RANK_OPTIONS = [
  { label: '全部', value: '' },
  { label: '无段位', value: 'none' },
  { label: '青铜', value: 'bronze' },
  { label: '白银', value: 'silver' },
  { label: '黄金', value: 'gold' },
  { label: '铂金', value: 'platinum' },
  { label: '钻石', value: 'diamond' },
  { label: '黑鹰', value: 'blackeagle' },
  { label: '巅峰', value: 'peak' },
];

const SAFEBOX_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '2x2', value: 4 },
  { label: '2x3', value: 6 },
  { label: '3x3', value: 9 },
];

const LEVEL_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '3级', value: 3 },
  { label: '4级', value: 4 },
  { label: '5级', value: 5 },
  { label: '6级', value: 6 },
  { label: '7级', value: 7 },
 ];

const fallbackHomepageConfig = {
  carousels: [],
  skinOptions: [],
  fallbackTitle: {
    badgeText: '专业哈夫币账号出租平台',
    mainTitle: '快速筛选可租账号',
    subTitle: '担保交易、押金保障、消息直连，让租号更安心。',
    buttonText: '发布账号',
  },
};

function sanitizeCarouselImage(src) {
  return dataTransformer.sanitizeImageSource ? dataTransformer.sanitizeImageSource(src) : src;
}

function buildCarouselView(carousels = []) {
  return carousels.map((item, index) => {
    const imageUrl = sanitizeCarouselImage(item.imageUrl || item.image || '') || DEFAULT_ACCOUNT_IMAGE;
    return {
      id: item.id || `carousel_${index}`,
      title: item.title || '',
      description: item.description || '',
      hasDescription: Boolean(item.description),
      imageUrl,
      targetUrl: item.linkUrl || item.link || '',
    };
  });
}

function buildSkinOptionsView(options = [], selectedSkins = []) {
  return options.map((item, index) => {
    const name = item.name || item.code || `皮肤${index + 1}`;
    const selected = selectedSkins.includes(name);
    return {
      id: item.id || `skin_${index}`,
      name,
      selected,
      className: selected ? 'active' : '',
    };
  });
}

function buildAccountView(accounts = []) {
  return accounts.map((item) => ({
    ...item,
    coverImage: item.images && item.images.length > 0 ? item.images[0] : DEFAULT_ACCOUNT_IMAGE,
    showKd: item.kd !== '-' && item.kd !== '0',
    showRegion: Boolean(item.regionText),
    showLoginMethod: Boolean(item.login_method),
    levelText: item.account_level ? `Lv.${item.account_level}` : '-',
    platformBadgeText: item.platformText || item.login_method,
    showSkinPreview: Array.isArray(item.tagPreview) && item.tagPreview.length > 0,
    showMoreTagCount: Number(item.moreTagCount || 0) > 0,
  }));
}

Page({
  data: {
    carouselView: [],
    hasCarousels: false,
    fallbackTitle: fallbackHomepageConfig.fallbackTitle,
    searchQuery: '',
    filters: {
      platformIndex: 0,
      minCoins: '',
      maxCoins: '',
      rankIndex: 0,
      safeboxIndex: 0,
      staminaIndex: 0,
      loadIndex: 0,
      provinceIndex: 0,
      minRental: '',
      maxRental: '',
      minDeposit: '',
      maxDeposit: '',
      minTotal: '',
      maxTotal: '',
    },
    platformOptions: PLATFORM_OPTIONS.map((item) => item.label),
    rankOptions: RANK_OPTIONS.map((item) => item.label),
    safeboxOptions: SAFEBOX_OPTIONS.map((item) => item.label),
    staminaOptions: LEVEL_OPTIONS.map((item) => item.label),
    loadOptions: LEVEL_OPTIONS.map((item) => item.label),
    provinceOptions: ['全部'],
    selectedPlatformText: '全部',
    selectedRankText: '全部',
    selectedSafeboxText: '全部',
    selectedStaminaText: '全部',
    selectedLoadText: '全部',
    selectedProvinceText: '全部',
    skinOptions: [],
    skinOptionsView: [],
    selectedSkins: [],
    selectedSkinCountText: '',
    showSelectedSkinCount: false,
    showMoreFilters: false,
    skinToggleText: '展开皮肤筛选',
    accounts: [],
    displayAccounts: [],
    displayAccountsView: [],
    loading: false,
    listErrorText: '',
    hasMore: false,
    page: 1,
    showLoginModal: false,
    showCustomerService: true,
    accountCountText: '共 0 个账号',
    showLoadingState: false,
    showErrorState: false,
    showInlineError: false,
    showInlineLoading: false,
    showEmptyState: false,
    hasAccounts: false,
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '首页' });
    this.syncFilterLabels();
    this.syncSkinState();
    this.syncAccountState();
    this.loadHomepageConfig();
    this.loadAccounts();
  },

  onPullDownRefresh() {
    Promise.all([this.loadHomepageConfig(), this.loadAccounts()]).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.onLoadMore();
    }
  },

  syncFilterLabels() {
    this.setData({
      selectedPlatformText: this.data.platformOptions[this.data.filters.platformIndex] || '全部',
      selectedRankText: this.data.rankOptions[this.data.filters.rankIndex] || '全部',
      selectedSafeboxText: this.data.safeboxOptions[this.data.filters.safeboxIndex] || '全部',
      selectedStaminaText: this.data.staminaOptions[this.data.filters.staminaIndex] || '全部',
      selectedLoadText: this.data.loadOptions[this.data.filters.loadIndex] || '全部',
      selectedProvinceText: this.data.provinceOptions[this.data.filters.provinceIndex] || '全部',
    });
  },

  syncSkinState() {
    const skinOptionsView = buildSkinOptionsView(this.data.skinOptions, this.data.selectedSkins);
    const selectedCount = this.data.selectedSkins.length;
    this.setData({
      skinOptionsView,
      selectedSkinCountText: `已选 ${selectedCount} 项`,
      showSelectedSkinCount: selectedCount > 0,
      skinToggleText: this.data.showMoreFilters ? '收起皮肤筛选' : '展开皮肤筛选',
    });
  },

  syncAccountState() {
    const accountCount = this.data.displayAccountsView.length;
    const hasAccounts = accountCount > 0;
    this.setData({
      accountCountText: `共 ${accountCount} 个账号`,
      hasAccounts,
      showLoadingState: this.data.loading && !hasAccounts,
      showErrorState: !this.data.loading && Boolean(this.data.listErrorText) && !hasAccounts,
      showInlineError: Boolean(this.data.listErrorText) && hasAccounts,
      showInlineLoading: this.data.loading && hasAccounts,
      showEmptyState: !this.data.loading && !this.data.listErrorText && !hasAccounts,
    });
  },

  updateProvinceOptions(accounts = []) {
    const uniqueProvinces = Array.from(new Set(accounts.map((item) => item.province).filter(Boolean)));
    const provinceOptions = ['全部'].concat(uniqueProvinces);
    const currentProvince = this.data.provinceOptions[this.data.filters.provinceIndex] || '全部';
    const nextProvinceIndex = Math.max(provinceOptions.indexOf(currentProvince), 0);

    this.setData({
      provinceOptions,
      'filters.provinceIndex': nextProvinceIndex,
    });
    this.syncFilterLabels();
  },

  loadHomepageConfig() {
    return api.getHomepageConfig()
      .then((res) => {
        const data = res && res.data ? res.data : {};
        const skinOptions = Array.isArray(data.skinOptions) ? data.skinOptions : [];
        const carouselView = buildCarouselView(Array.isArray(data.carousels) ? data.carousels : []);
        this.setData({
          carouselView,
          hasCarousels: carouselView.length > 0,
          skinOptions,
          fallbackTitle: data.fallbackTitle || fallbackHomepageConfig.fallbackTitle,
        });
        this.syncSkinState();
      })
      .catch((error) => {
        console.error('加载首页配置失败:', error);
        const homepageConfig = mockData.homepageConfig || fallbackHomepageConfig;
        const skinOptions = homepageConfig.skinOptions || [];
        const carouselView = buildCarouselView(homepageConfig.carousels || []);
        this.setData({
          carouselView,
          hasCarousels: carouselView.length > 0,
          skinOptions,
          fallbackTitle: homepageConfig.fallbackTitle || fallbackHomepageConfig.fallbackTitle,
        });
        this.syncSkinState();
      });
  },

  loadAccounts() {
    this.setData({ loading: true, listErrorText: '' });
    this.syncAccountState();

    return api.getAccounts({
      limit: 200,
      status: 'available',
      auditStatus: 'approved',
    })
      .then((res) => {
        const payload = res && res.data ? res.data : {};
        const sourceList = Array.isArray(payload) ? payload : (payload.list || payload.accounts || []);
        const accounts = dataTransformer.transformAccountList(sourceList);
        this.setData({
          accounts,
          listErrorText: '',
          hasMore: false,
        });
        this.updateProvinceOptions(accounts);
        this.applyFilters();
      })
      .catch((error) => {
        console.error('加载账号列表失败:', error);
        if (config.useMockData && Array.isArray(mockData.accounts)) {
          const accounts = dataTransformer.transformAccountList(mockData.accounts);
          this.setData({
            accounts,
            listErrorText: '',
            hasMore: false,
          });
          this.updateProvinceOptions(accounts);
          this.applyFilters();
          return;
        }

        this.setData({
          accounts: [],
          displayAccounts: [],
          displayAccountsView: [],
          listErrorText: (error && error.error) || '账号列表加载失败，请稍后重试。',
          hasMore: false,
        });
        this.syncAccountState();
      })
      .finally(() => {
        this.setData({ loading: false });
        this.syncAccountState();
      });
  },

  applyFilters() {
    const searchKeyword = this.data.searchQuery.trim().toLowerCase();
    const minCoins = Number(this.data.filters.minCoins || 0);
    const maxCoins = Number(this.data.filters.maxCoins || 0);
    const minRental = Number(this.data.filters.minRental || 0);
    const maxRental = Number(this.data.filters.maxRental || 0);
    const minDeposit = Number(this.data.filters.minDeposit || 0);
    const maxDeposit = Number(this.data.filters.maxDeposit || 0);
    const minTotal = Number(this.data.filters.minTotal || 0);
    const maxTotal = Number(this.data.filters.maxTotal || 0);
    const selectedPlatform = PLATFORM_OPTIONS[this.data.filters.platformIndex] || PLATFORM_OPTIONS[0];
    const selectedRank = RANK_OPTIONS[this.data.filters.rankIndex] || RANK_OPTIONS[0];
    const selectedSafebox = SAFEBOX_OPTIONS[this.data.filters.safeboxIndex] || SAFEBOX_OPTIONS[0];
    const selectedStamina = LEVEL_OPTIONS[this.data.filters.staminaIndex] || LEVEL_OPTIONS[0];
    const selectedLoad = LEVEL_OPTIONS[this.data.filters.loadIndex] || LEVEL_OPTIONS[0];
    const selectedProvince = this.data.provinceOptions[this.data.filters.provinceIndex] || '全部';
    const selectedSkins = this.data.selectedSkins;

    const displayAccounts = this.data.accounts.filter((account) => {
      const searchableText = [
        account.fullTitle,
        account.account_name,
        account.regionText,
        (account.tags || []).join(' '),
      ].join(' ').toLowerCase();

      if (searchKeyword && !searchableText.includes(searchKeyword)) return false;
      if (minCoins && account.coinsValue < minCoins) return false;
      if (maxCoins && account.coinsValue > maxCoins) return false;
      if (minRental && account.actualRentalValue < minRental) return false;
      if (maxRental && account.actualRentalValue > maxRental) return false;
      if (minDeposit && account.depositValue < minDeposit) return false;
      if (maxDeposit && account.depositValue > maxDeposit) return false;
      if (minTotal && account.totalPriceValue < minTotal) return false;
      if (maxTotal && account.totalPriceValue > maxTotal) return false;
      if (selectedPlatform.value && account.loginMethodKey !== selectedPlatform.value) return false;
      if (selectedRank.value && account.rankKey !== selectedRank.value) return false;
      if (selectedSafebox.value && account.safeboxCount !== selectedSafebox.value) return false;
      if (selectedStamina.value && Number(account.stamina_level) !== selectedStamina.value) return false;
      if (selectedLoad.value && Number(account.load_level) !== selectedLoad.value) return false;
      if (selectedProvince !== '全部' && account.province !== selectedProvince) return false;
      if (selectedSkins.length > 0 && !selectedSkins.some((skin) => (account.tags || []).includes(skin))) return false;
      return true;
    });

    this.setData({
      displayAccounts,
      displayAccountsView: buildAccountView(displayAccounts),
      page: 1,
      hasMore: false,
    });
    this.syncAccountState();
  },

  onRetryAccounts() {
    this.loadAccounts();
  },

  onCarouselTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: url.startsWith('/') ? url : `/${url}` });
  },

  onCarouselImageError(e) {
    const id = e.currentTarget.dataset.id;
    const nextList = this.data.carouselView.map((item) => (
      item.id === id ? { ...item, imageUrl: DEFAULT_ACCOUNT_IMAGE } : item
    ));
    this.setData({ carouselView: nextList });
  },

  onCardImageError(e) {
    const id = e.currentTarget.dataset.id;
    const nextList = this.data.displayAccountsView.map((item) => (
      item.id === id ? { ...item, coverImage: DEFAULT_ACCOUNT_IMAGE } : item
    ));
    this.setData({ displayAccountsView: nextList });
  },

  onPublishTap() {
    const userInfo = storage.getUserInfo();
    if (!userInfo) {
      this.setData({ showLoginModal: true });
      return;
    }

    if (!(userInfo.isVerified || userInfo.isRealNameVerified || userInfo.verifyStatus === 'approved')) {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' });
      return;
    }

    wx.navigateTo({ url: '/pages/account/publish/index' });
  },

  onCustomerServiceTap() {
    wx.switchTab({ url: '/pages/chat/list/index' });
  },

  onPlatformChange(e) {
    this.setData({ 'filters.platformIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onRankChange(e) {
    this.setData({ 'filters.rankIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onSafeboxChange(e) {
    this.setData({ 'filters.safeboxIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onStaminaChange(e) {
    this.setData({ 'filters.staminaIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onLoadChange(e) {
    this.setData({ 'filters.loadIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onProvinceChange(e) {
    this.setData({ 'filters.provinceIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.applyFilters();
  },

  onMinCoinsInput(e) {
    this.setData({ 'filters.minCoins': e.detail.value });
    this.applyFilters();
  },

  onMaxCoinsInput(e) {
    this.setData({ 'filters.maxCoins': e.detail.value });
    this.applyFilters();
  },

  onMinRentalInput(e) {
    this.setData({ 'filters.minRental': e.detail.value });
    this.applyFilters();
  },

  onMaxRentalInput(e) {
    this.setData({ 'filters.maxRental': e.detail.value });
    this.applyFilters();
  },

  onMinDepositInput(e) {
    this.setData({ 'filters.minDeposit': e.detail.value });
    this.applyFilters();
  },

  onMaxDepositInput(e) {
    this.setData({ 'filters.maxDeposit': e.detail.value });
    this.applyFilters();
  },

  onMinTotalInput(e) {
    this.setData({ 'filters.minTotal': e.detail.value });
    this.applyFilters();
  },

  onMaxTotalInput(e) {
    this.setData({ 'filters.maxTotal': e.detail.value });
    this.applyFilters();
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
    this.applyFilters();
  },

  onSearchConfirm() {
    this.applyFilters();
  },

  onShowMoreFilters() {
    this.setData({ showMoreFilters: !this.data.showMoreFilters });
    this.syncSkinState();
  },

  onResetFilters() {
    this.setData({
      searchQuery: '',
      filters: {
        platformIndex: 0,
        minCoins: '',
        maxCoins: '',
        rankIndex: 0,
        safeboxIndex: 0,
        staminaIndex: 0,
        loadIndex: 0,
        provinceIndex: 0,
        minRental: '',
        maxRental: '',
        minDeposit: '',
        maxDeposit: '',
        minTotal: '',
        maxTotal: '',
      },
      selectedSkins: [],
    });
    this.syncFilterLabels();
    this.syncSkinState();
    this.applyFilters();
  },

  onSkinTap(e) {
    const name = e.currentTarget.dataset.name;
    const selectedSkins = this.data.selectedSkins.slice();
    const index = selectedSkins.indexOf(name);

    if (index >= 0) {
      selectedSkins.splice(index, 1);
    } else {
      selectedSkins.push(name);
    }

    this.setData({ selectedSkins });
    this.syncSkinState();
    this.applyFilters();
  },

  onLoadMore() {
    wx.showToast({ title: '当前已加载全部账号', icon: 'none' });
  },

  onAccountTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/account/detail/index?id=${id}` });
  },

  onLoginSuccess() {
    this.setData({ showLoginModal: false });
    this.loadAccounts();
  },

  onCustomerServiceClose() {
    this.setData({ showCustomerService: false });
  },
});
