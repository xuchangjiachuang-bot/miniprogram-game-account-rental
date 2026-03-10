// pages/index/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');

Page({
  data: {
    // 轮播图
    carousels: [],
    
    // 备用标题
    fallbackTitle: {
      badgeText: '专业哈夫币出租平台',
      mainTitle: '哈夫币出租',
      subTitle: '安全快捷的哈夫币租赁服务 | 担保交易 | 押金保障',
      buttonText: '发布账号'
    },
    
    // 筛选项
    filters: {
      platformIndex: 0,
      minCoins: '',
      maxCoins: '',
      rankIndex: 0,
      safeboxIndex: 0,
      provinceIndex: 0,
      cityIndex: 0,
      minRental: '',
      maxRental: '',
      minDeposit: '',
      maxDeposit: ''
    },
    
    // 筛选选项
    platformOptions: ['全部', 'Wegame · 微信扫码', 'Wegame · QQ账号密码', 'Steam · 账号密码'],
    rankOptions: ['全部', '青铜', '白银', '黄金', '铂金', '钻石', '黑鹰', '巅峰'],
    safeboxOptions: ['全部', '1×2', '2×2', '2×3', '3×3'],
    
    // 皮肤选项
    skinOptions: [],
    selectedSkins: [],
    
    // 展开/收起筛选器
    showMoreFilters: false,
    
    // 账号列表
    accounts: [],
    displayAccounts: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    console.log('首页加载');
    
    // 加载首页配置
    this.loadHomepageConfig();
    
    // 加载账号列表
    this.loadAccounts();
  },

  onShow() {
    // 页面显示时刷新数据
    // this.loadAccounts();
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.setData({
      page: 1,
      accounts: []
    });
    this.loadAccounts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    // 上拉加载更多
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreAccounts();
    }
  },

  /**
   * 加载首页配置
   */
  loadHomepageConfig() {
    const that = this;
    
    api.getHomepageConfig()
      .then(res => {
        const { data } = res;
        
        that.setData({
          carousels: data.carousels || [],
          skinOptions: data.skinOptions || [],
          fallbackTitle: data.fallbackTitle || that.data.fallbackTitle
        });
        
        console.log('首页配置加载成功:', data);
      })
      .catch(error => {
        console.error('加载首页配置失败:', error);
      });
  },

  /**
   * 加载账号列表
   */
  loadAccounts() {
    const that = this;
    
    that.setData({ loading: true });
    
    const params = that.buildFilterParams();
    
    api.getAccounts({
      page: that.data.page,
      pageSize: that.data.pageSize,
      ...params
    })
    .then(res => {
      const { data } = res;
      const accounts = data.list || [];
      
      let newAccounts = [];
      if (that.data.page === 1) {
        newAccounts = accounts;
      } else {
        newAccounts = [...that.data.accounts, ...accounts];
      }
      
      that.setData({
        accounts: newAccounts,
        displayAccounts: newAccounts,
        hasMore: accounts.length >= that.data.pageSize,
        loading: false
      });
    })
    .catch(error => {
      console.error('加载账号列表失败:', error);
      that.setData({ loading: false });
      
      wx.showToast({
        title: error.error || '加载失败',
        icon: 'none'
      });
    });
  },

  /**
   * 加载更多账号
   */
  loadMoreAccounts() {
    const that = this;
    
    that.setData({
      page: that.data.page + 1
    });
    
    that.loadAccounts();
  },

  /**
   * 构建筛选参数
   */
  buildFilterParams() {
    const { filters, selectedSkins } = this.data;
    const params = {};
    
    // 平台
    if (filters.platformIndex > 0) {
      const platform = this.data.platformOptions[filters.platformIndex];
      if (platform.includes('微信')) params.loginMethod = 'wechat';
      else if (platform.includes('QQ')) params.loginMethod = 'qq';
      else if (platform.includes('Steam')) params.loginMethod = 'steam';
    }
    
    // 哈夫币范围
    if (filters.minCoins) params.minCoins = filters.minCoins;
    if (filters.maxCoins) params.maxCoins = filters.maxCoins;
    
    // 段位
    if (filters.rankIndex > 0) {
      params.rank = this.data.rankOptions[filters.rankIndex];
    }
    
    // 安全箱
    if (filters.safeboxIndex > 0) {
      params.safebox = this.data.safeboxOptions[filters.safeboxIndex];
    }
    
    // 皮肤
    if (selectedSkins.length > 0) {
      params.skins = selectedSkins.join(',');
    }
    
    return params;
  },

  /**
   * 点击轮播图
   */
  onCarouselTap(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.navigateTo({
        url: url.startsWith('/') ? url : `/${url}`
      });
    }
  },

  /**
   * 点击发布按钮
   */
  onPublishTap() {
    const userInfo = storage.getUserInfo();
    
    if (!userInfo) {
      wx.navigateTo({
        url: '/pages/auth/login/index'
      });
      return;
    }
    
    if (!userInfo.isVerified) {
      wx.showToast({
        title: '请先完成实名认证',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/account/publish/index'
    });
  },

  /**
   * 平台选择
   */
  onPlatformChange(e) {
    this.setData({
      'filters.platformIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 哈夫币最小值输入
   */
  onMinCoinsInput(e) {
    this.setData({
      'filters.minCoins': e.detail.value
    });
  },

  /**
   * 哈夫币最大值输入
   */
  onMaxCoinsInput(e) {
    this.setData({
      'filters.maxCoins': e.detail.value
    });
  },

  /**
   * 段位选择
   */
  onRankChange(e) {
    this.setData({
      'filters.rankIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 安全箱选择
   */
  onSafeboxChange(e) {
    this.setData({
      'filters.safeboxIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 展开/收起筛选器
   */
  onShowMoreFilters() {
    this.setData({
      showMoreFilters: !this.data.showMoreFilters
    });
  },

  /**
   * 重置筛选
   */
  onResetFilters() {
    this.setData({
      filters: {
        platformIndex: 0,
        minCoins: '',
        maxCoins: '',
        rankIndex: 0,
        safeboxIndex: 0,
        provinceIndex: 0,
        cityIndex: 0,
        minRental: '',
        maxRental: '',
        minDeposit: '',
        maxDeposit: ''
      },
      selectedSkins: []
    });
    this.resetAndLoad();
  },

  /**
   * 点击皮肤
   */
  onSkinTap(e) {
    const { name } = e.currentTarget.dataset;
    let selectedSkins = [...this.data.selectedSkins];
    
    const index = selectedSkins.indexOf(name);
    if (index > -1) {
      selectedSkins.splice(index, 1);
    } else {
      selectedSkins.push(name);
    }
    
    this.setData({ selectedSkins });
    this.resetAndLoad();
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    this.loadMoreAccounts();
  },

  /**
   * 点击账号卡片
   */
  onAccountTap(e) {
    const { account } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/account/detail/index?id=${account.id}`
    });
  },

  /**
   * 重置并重新加载
   */
  resetAndLoad() {
    this.setData({
      page: 1,
      accounts: []
    });
    this.loadAccounts();
  }
});
