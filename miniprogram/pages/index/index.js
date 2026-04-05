const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const config = require('../../utils/config.js');
const mockData = require('../../utils/mock-data.js');
const dataTransformer = require('../../utils/data-transformer.js');

const fallbackHomepageConfig = {
  carousels: [],
  skinOptions: [],
  fallbackTitle: {
    badgeText: '哈夫币账号出租平台',
    mainTitle: '快速找到靠谱账号',
    subTitle: '担保交易、押金保护、消息直连，让租号更安心。',
    buttonText: '发布账号',
  },
};

function buildCarouselView(carousels = []) {
  return carousels.map((item, index) => ({
    id: item.id || `carousel_${index}`,
    title: item.title || '',
    description: item.description || '',
    hasDescription: Boolean(item.description),
    imageUrl: item.imageUrl || item.image || '/images/default-account.png',
    targetUrl: item.linkUrl || item.link || '',
  }));
}

function buildSkinOptionsView(options = [], selectedSkins = []) {
  return options.map((item, index) => ({
    id: item.id || `skin_${index}`,
    name: item.name || '',
    selected: selectedSkins.includes(item.name),
    className: selectedSkins.includes(item.name) ? 'active' : '',
  }));
}

function buildAccountView(accounts = []) {
  return accounts.map((item) => ({
    ...item,
    coverImage: item.images && item.images.length > 0 ? item.images[0] : '/images/default-account.png',
    showKd: Number(item.kd || 0) > 0,
    showRegion: Boolean(item.regionText),
    showKdOrRegion: Number(item.kd || 0) > 0 || Boolean(item.regionText),
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
      provinceIndex: 0,
      minRental: '',
      maxRental: '',
    },
    platformOptions: ['全部', '微信扫码', 'QQ 账号密码', 'Steam 账号密码'],
    rankOptions: ['全部', '青铜', '白银', '黄金', '铂金', '钻石', '黑鹰', '巅峰'],
    safeboxOptions: ['全部', '1 格', '2 格', '3 格', '4 格以上'],
    provinceOptions: ['全部', '北京', '上海', '广东', '浙江', '江苏', '四川', '湖北'],
    selectedPlatformText: '全部',
    selectedRankText: '全部',
    selectedSafeboxText: '全部',
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
    this.loadHomepageConfig();
    this.loadAccounts();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, accounts: [], displayAccounts: [], displayAccountsView: [], listErrorText: '' });
    this.syncAccountState();
    Promise.all([this.loadHomepageConfig(), this.loadAccounts()]).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreAccounts();
    }
  },

  syncFilterLabels() {
    this.setData({
      selectedPlatformText: this.data.platformOptions[this.data.filters.platformIndex] || this.data.platformOptions[0],
      selectedRankText: this.data.rankOptions[this.data.filters.rankIndex] || this.data.rankOptions[0],
      selectedSafeboxText: this.data.safeboxOptions[this.data.filters.safeboxIndex] || this.data.safeboxOptions[0],
      selectedProvinceText: this.data.provinceOptions[this.data.filters.provinceIndex] || this.data.provinceOptions[0],
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
        const homepageConfig = config.useMockData && mockData.homepageConfig ? mockData.homepageConfig : fallbackHomepageConfig;
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
    const params = this.buildFilterParams();

    return api.getAccounts({ limit: 200, ...params })
      .then((res) => {
        const data = res && res.data ? res.data : {};
        const accounts = Array.isArray(data) ? data : (data.list || data.accounts || []);
        const transformedAccounts = dataTransformer.transformAccountList(accounts);
        const nextAccounts = this.data.page === 1 ? transformedAccounts : this.data.accounts.concat(transformedAccounts);
        this.setData({
          accounts: nextAccounts,
          displayAccounts: nextAccounts,
          displayAccountsView: buildAccountView(nextAccounts),
          hasMore: false,
          listErrorText: '',
        });
      })
      .catch((error) => {
        console.error('加载账号列表失败:', error);
        if (config.useMockData) {
          const accounts = dataTransformer.transformAccountList(mockData.accounts || []);
          this.setData({
            accounts,
            displayAccounts: accounts,
            displayAccountsView: buildAccountView(accounts),
            hasMore: false,
            listErrorText: '',
          });
          return;
        }

        this.setData({
          listErrorText: error && error.error ? error.error : '账号列表加载失败，请稍后重试。',
          hasMore: false,
        });
      })
      .finally(() => {
        this.setData({ loading: false });
        this.syncAccountState();
      });
  },

  loadMoreAccounts() {
    this.setData({ page: this.data.page + 1 });
    this.loadAccounts();
  },

  buildFilterParams() {
    const filters = this.data.filters;
    const selectedSkins = this.data.selectedSkins;
    const searchQuery = this.data.searchQuery;
    const params = {};

    if (searchQuery) params.keyword = searchQuery;
    if (filters.minCoins) params.minCoins = filters.minCoins;
    if (filters.maxCoins) params.maxCoins = filters.maxCoins;
    if (filters.minRental) params.minRental = filters.minRental;
    if (filters.maxRental) params.maxRental = filters.maxRental;

    if (filters.platformIndex > 0) {
      const platformMap = { 1: 'wechat', 2: 'qq', 3: 'steam' };
      params.loginMethod = platformMap[filters.platformIndex];
    }
    if (filters.rankIndex > 0) params.rank = this.data.rankOptions[filters.rankIndex];
    if (filters.safeboxIndex > 0) params.safebox = String(filters.safeboxIndex);
    if (filters.provinceIndex > 0) params.province = this.data.provinceOptions[filters.provinceIndex];
    if (selectedSkins.length > 0) params.skins = selectedSkins.join(',');

    return params;
  },

  resetAndLoad() {
    this.setData({ page: 1, accounts: [], displayAccounts: [], displayAccountsView: [], listErrorText: '' });
    this.syncAccountState();
    this.loadAccounts();
  },

  onRetryAccounts() {
    this.resetAndLoad();
  },

  onCarouselTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: url.startsWith('/') ? url : `/${url}` });
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
    this.resetAndLoad();
  },

  onRankChange(e) {
    this.setData({ 'filters.rankIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.resetAndLoad();
  },

  onSafeboxChange(e) {
    this.setData({ 'filters.safeboxIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.resetAndLoad();
  },

  onProvinceChange(e) {
    this.setData({ 'filters.provinceIndex': Number(e.detail.value) || 0 });
    this.syncFilterLabels();
    this.resetAndLoad();
  },

  onMinCoinsInput(e) { this.setData({ 'filters.minCoins': e.detail.value }); },
  onMaxCoinsInput(e) { this.setData({ 'filters.maxCoins': e.detail.value }); },
  onMinRentalInput(e) { this.setData({ 'filters.minRental': e.detail.value }); },
  onMaxRentalInput(e) { this.setData({ 'filters.maxRental': e.detail.value }); },
  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearchConfirm() { this.resetAndLoad(); },

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
        provinceIndex: 0,
        minRental: '',
        maxRental: '',
      },
      selectedSkins: [],
    });
    this.syncFilterLabels();
    this.syncSkinState();
    this.resetAndLoad();
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
    this.resetAndLoad();
  },

  onLoadMore() {
    this.loadMoreAccounts();
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

  onReady() {
    this.syncFilterLabels();
    this.syncSkinState();
    this.syncAccountState();
  },
});
