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

Page({
  data: {
    carousels: [],
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
    skinOptions: [],
    skinOptionsView: [],
    selectedSkins: [],
    showMoreFilters: false,
    accounts: [],
    displayAccounts: [],
    loading: false,
    hasMore: false,
    page: 1,
    showLoginModal: false,
    showCustomerService: true,
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '首页' });
    this.loadHomepageConfig();
    this.loadAccounts();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, accounts: [], displayAccounts: [] });
    Promise.all([this.loadHomepageConfig(), this.loadAccounts()]).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMoreAccounts();
  },

  buildSkinOptionsView(options, selectedSkins) {
    return (options || []).map((item) => ({
      ...item,
      selected: selectedSkins.includes(item.name),
    }));
  },

  syncSkinOptionsView() {
    this.setData({
      skinOptionsView: this.buildSkinOptionsView(this.data.skinOptions, this.data.selectedSkins),
    });
  },

  loadHomepageConfig() {
    return api.getHomepageConfig()
      .then((res) => {
        const data = res?.data || {};
        const skinOptions = Array.isArray(data.skinOptions) ? data.skinOptions : [];
        this.setData({
          carousels: Array.isArray(data.carousels) ? data.carousels : [],
          skinOptions,
          skinOptionsView: this.buildSkinOptionsView(skinOptions, this.data.selectedSkins),
          fallbackTitle: data.fallbackTitle || fallbackHomepageConfig.fallbackTitle,
        });
      })
      .catch((error) => {
        console.error('加载首页配置失败:', error);
        const homepageConfig = config.useMockData && mockData.homepageConfig
          ? mockData.homepageConfig
          : fallbackHomepageConfig;
        const skinOptions = homepageConfig.skinOptions || [];
        this.setData({
          carousels: homepageConfig.carousels || [],
          skinOptions,
          skinOptionsView: this.buildSkinOptionsView(skinOptions, this.data.selectedSkins),
          fallbackTitle: homepageConfig.fallbackTitle || fallbackHomepageConfig.fallbackTitle,
        });
      });
  },

  loadAccounts() {
    this.setData({ loading: true });
    const params = this.buildFilterParams();

    return api.getAccounts({ limit: 200, ...params })
      .then((res) => {
        const data = res?.data || {};
        const accounts = Array.isArray(data) ? data : (data.list || data.accounts || []);
        const transformedAccounts = dataTransformer.transformAccountList(accounts);
        const nextAccounts = this.data.page === 1 ? transformedAccounts : this.data.accounts.concat(transformedAccounts);
        this.setData({ accounts: nextAccounts, displayAccounts: nextAccounts, hasMore: false });
      })
      .catch((error) => {
        console.error('加载账号列表失败:', error);
        if (config.useMockData) {
          const accounts = dataTransformer.transformAccountList(mockData.accounts || []);
          this.setData({ accounts, displayAccounts: accounts, hasMore: false });
          return;
        }
        wx.showToast({ title: error.error || '加载失败', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },

  loadMoreAccounts() {
    this.setData({ page: this.data.page + 1 });
    this.loadAccounts();
  },

  buildFilterParams() {
    const { filters, selectedSkins, searchQuery } = this.data;
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
    this.setData({ page: 1, accounts: [], displayAccounts: [] });
    this.loadAccounts();
  },

  onCarouselTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: url.startsWith('/') ? url : '/' + url });
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

  onPlatformChange(e) { this.setData({ 'filters.platformIndex': Number(e.detail.value) || 0 }); this.resetAndLoad(); },
  onRankChange(e) { this.setData({ 'filters.rankIndex': Number(e.detail.value) || 0 }); this.resetAndLoad(); },
  onSafeboxChange(e) { this.setData({ 'filters.safeboxIndex': Number(e.detail.value) || 0 }); this.resetAndLoad(); },
  onProvinceChange(e) { this.setData({ 'filters.provinceIndex': Number(e.detail.value) || 0 }); this.resetAndLoad(); },
  onMinCoinsInput(e) { this.setData({ 'filters.minCoins': e.detail.value }); },
  onMaxCoinsInput(e) { this.setData({ 'filters.maxCoins': e.detail.value }); },
  onMinRentalInput(e) { this.setData({ 'filters.minRental': e.detail.value }); },
  onMaxRentalInput(e) { this.setData({ 'filters.maxRental': e.detail.value }); },
  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearchConfirm() { this.resetAndLoad(); },
  onShowMoreFilters() { this.setData({ showMoreFilters: !this.data.showMoreFilters }); },

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
    this.syncSkinOptionsView();
    this.resetAndLoad();
  },

  onSkinTap(e) {
    const name = e.currentTarget.dataset.name;
    const selectedSkins = this.data.selectedSkins.slice();
    const index = selectedSkins.indexOf(name);
    if (index >= 0) selectedSkins.splice(index, 1);
    else selectedSkins.push(name);
    this.setData({ selectedSkins, skinOptionsView: this.buildSkinOptionsView(this.data.skinOptions, selectedSkins) });
    this.resetAndLoad();
  },

  onLoadMore() { this.loadMoreAccounts(); },

  onAccountTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/account/detail/index?id=' + id });
  },

  onLoginSuccess() {
    this.setData({ showLoginModal: false });
    this.loadAccounts();
  },

  onCustomerServiceClose() {
    this.setData({ showCustomerService: false });
  },
});
