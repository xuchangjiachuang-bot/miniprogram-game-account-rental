// pages/index/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const config = require('../../utils/config.js');
const mockData = require('../../utils/mock-data.js');
const dataTransformer = require('../../utils/data-transformer.js');

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
    
    // 搜索关键词
    searchQuery: '',
    
    // 筛选项
    filters: {
      platformIndex: 0,
      minCoins: '',
      maxCoins: '',
      rankIndex: 0,
      safeboxIndex: 0,
      staminaIndex: 0,
      loadIndex: 0,
      provinceIndex: 0,
      cityIndex: 0,
      minRental: '',
      maxRental: '',
      minDeposit: '',
      maxDeposit: '',
      minTotal: '',
      maxTotal: ''
    },
    
    // 筛选选项
    platformOptions: ['全部', 'Wegame · 微信扫码', 'Wegame · QQ账号密码', 'Steam · 账号密码'],
    rankOptions: ['全部', '青铜', '白银', '黄金', '铂金', '钻石', '黑鹰', '巅峰'],
    safeboxOptions: ['全部', '1×2', '2×2', '2×3', '3×3'],
    staminaOptions: ['全部', '3级', '4级', '5级', '6级', '7级'],
    loadOptions: ['全部', '3级', '4级', '5级', '6级', '7级'],
    provinceOptions: ['全部', '北京', '上海', '广东', '浙江', '江苏', '四川', '湖北'],
    
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
    pageSize: 10,
    
    // 登录弹窗
    showLoginModal: false,

    // 企业微信客服悬浮按钮
    showCustomerService: true
  },

  onLoad() {
    console.log('首页加载');

    // 设置空标题
    wx.setNavigationBarTitle({
      title: ''
    });

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
        
        // 使用Mock数据
        if (config.useMockData) {
          console.log('使用Mock数据加载首页配置');
          that.setData({
            carousels: mockData.homepageConfig.carousels,
            skinOptions: mockData.homepageConfig.skinOptions,
            fallbackTitle: mockData.homepageConfig.fallbackTitle
          });
        }
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

      // 使用数据转换工具转换账号数据
      const transformedAccounts = dataTransformer.transformAccountList(accounts);

      let newAccounts = [];
      if (that.data.page === 1) {
        newAccounts = transformedAccounts;
      } else {
        newAccounts = [...that.data.accounts, ...transformedAccounts];
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
      
      // 使用Mock数据
      if (config.useMockData) {
        console.log('使用Mock数据加载账号列表');
        const accounts = mockData.accounts.map(acc => that.transformAccount(acc));
        that.setData({
          accounts: accounts,
          displayAccounts: accounts,
          hasMore: false
        });
      } else {
        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none'
        });
      }
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
    const { filters, selectedSkins, searchQuery } = this.data;
    const params = {};
    
    // 搜索关键词
    if (searchQuery) {
      params.keyword = searchQuery;
    }
    
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
      // 显示登录弹窗，不跳转
      this.setData({ showLoginModal: true });
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
   * 体力等级选择
   */
  onStaminaChange(e) {
    this.setData({
      'filters.staminaIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 负重等级选择
   */
  onLoadChange(e) {
    this.setData({
      'filters.loadIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 地区选择
   */
  onProvinceChange(e) {
    this.setData({
      'filters.provinceIndex': parseInt(e.detail.value)
    });
    this.resetAndLoad();
  },

  /**
   * 租金最小值输入
   */
  onMinRentalInput(e) {
    this.setData({
      'filters.minRental': e.detail.value
    });
  },

  /**
   * 租金最大值输入
   */
  onMaxRentalInput(e) {
    this.setData({
      'filters.maxRental': e.detail.value
    });
  },

  /**
   * 押金最小值输入
   */
  onMinDepositInput(e) {
    this.setData({
      'filters.minDeposit': e.detail.value
    });
  },

  /**
   * 押金最大值输入
   */
  onMaxDepositInput(e) {
    this.setData({
      'filters.maxDeposit': e.detail.value
    });
  },

  /**
   * 总价最小值输入
   */
  onMinTotalInput(e) {
    this.setData({
      'filters.minTotal': e.detail.value
    });
  },

  /**
   * 总价最大值输入
   */
  onMaxTotalInput(e) {
    this.setData({
      'filters.maxTotal': e.detail.value
    });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    });
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
        cityIndex: 0,
        minRental: '',
        maxRental: '',
        minDeposit: '',
        maxDeposit: '',
        minTotal: '',
        maxTotal: ''
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
  },

  /**
   * 登录成功回调
   */
  onLoginSuccess(e) {
    console.log('首页收到登录成功事件:', e.detail);
    this.setData({ showLoginModal: false });
    // 可以重新加载数据等操作
    this.loadAccounts();
  },

  /**
   * 企业微信客服点击
   */
  onCustomerServiceTap(e) {
    console.log('点击企业微信客服');
    // 组件内部已经处理了打开客服的逻辑
  },

  /**
   * 企业微信客服关闭
   */
  onCustomerServiceClose(e) {
    console.log('关闭企业微信客服');
    this.setData({ showCustomerService: false });
  }
});
