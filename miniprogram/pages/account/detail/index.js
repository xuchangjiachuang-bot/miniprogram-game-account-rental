// pages/account/detail/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const dataTransformer = require('../../../utils/data-transformer.js');

const app = getApp();

Page({
  data: {
    id: '',
    account: {
      images: [],
      skins: [],
      region: {}
    },
    currentImageIndex: 0,
    loading: false,
    error: null,
    showLoginModal: false
  },

  onLoad(options) {
    console.log('账号详情页面加载', options);

    const { id } = options;
    if (!id) {
      wx.showToast({ title: '账号ID缺失', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ id });
    this.loadAccountDetail();
  },

  onShow() {
    // 每次显示时刷新账号状态
    if (this.data.id) {
      this.loadAccountDetail();
    }
  },

  onShareAppMessage() {
    const { account } = this.data;
    return {
      title: account.fullTitle || '游戏账号租赁',
      path: `/pages/account/detail/index?id=${this.data.id}`,
      imageUrl: account.images[0] || ''
    };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadAccountDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载账号详情
   */
  loadAccountDetail() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    const that = this;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    api.getAccountDetail(that.data.id)
      .then(res => {
        const { data } = res;

        // 使用data-transformer转换数据
        const account = dataTransformer.transformAccount(data);

        that.setData({
          account,
          currentImageIndex: 0,
          loading: false,
          error: null
        });
        wx.hideLoading();
      })
      .catch(error => {
        console.error('加载账号详情失败:', error);
        wx.hideLoading();

        // 使用Mock数据
        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const apiData = mockData.accounts.find(a => a.id === that.data.id) || mockData.accounts[0] || {
            id: that.data.id,
            account_name: '测试高级账号',
            coins: 120000,
            ratio: 0.5,
            rent_price: 10,
            rent_unit: 'hour',
            loginMethod: 'wechat',
            status: 'available',
            rank: 'diamond',
            account_level: 50,
            coins_display: '120万',
            ratio_display: '1:0.5',
            safebox: 6,
            stamina_level: 6,
            load_level: 7,
            kd: 2.5,
            awmBullets: 100,
            level6Armor: 5,
            level6Helmet: 3,
            province: '广东省',
            city: '广州市',
            view_count: 156,
            trade_count: 23,
            created_at: '2024-01-15',
            deposit: 100,
            rental_description: '1小时',
            images: ['/images/account-sample.jpg'],
            skins: ['M416-雷霆', 'AWM-龙狙', '吉利服-至尊'],
            description: '这是一个测试账号描述，包含皮肤、枪械等丰富内容。',
            owner: {
              id: 'TEST_OWNER_001',
              nickname: '测试商家',
              avatar: '/images/default-avatar.png'
            },
            tags: ['皮肤多', '枪械全', '信誉好']
          };

          // 转换Mock数据
          const account = dataTransformer.transformAccount({
            id: apiData.id,
            accountId: apiData.id,
            title: apiData.account_name,
            coinsM: (apiData.coins / 1000000).toFixed(2),
            safeboxCount: apiData.safebox,
            staminaValue: apiData.stamina_level,
            energyValue: apiData.load_level,
            accountValue: apiData.rent_price,
            deposit: apiData.deposit,
            rentalDays: 1,
            rentalRatio: 35,
            customAttributes: {
              loginMethod: apiData.loginMethod,
              accountLevel: apiData.account_level,
              rank: apiData.rank,
              kd: apiData.kd,
              province: apiData.province,
              city: apiData.city
            },
            tags: apiData.tags,
            screenshots: apiData.images,
            description: apiData.description,
            status: apiData.status,
            sellerId: apiData.owner?.id,
            // 新增字段
            awmBullets: apiData.awmBullets,
            level6Armor: apiData.level6Armor,
            level6Helmet: apiData.level6Helmet,
            viewCount: apiData.view_count,
            tradeCount: apiData.trade_count,
            createdAt: apiData.created_at,
            skins: apiData.skins
          });

          that.setData({
            account,
            currentImageIndex: 0,
            loading: false,
            error: null
          });
        } else {
          that.setData({
            loading: false,
            error: error.error || '加载失败'
          });
          wx.showToast({
            title: error.error || '加载失败',
            icon: 'none'
          });
        }
      });
  },

  /**
   * 轮播图切换
   */
  onSwiperChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  /**
   * 上一张图片
   */
  onPrevImage() {
    const { account, currentImageIndex } = this.data;
    const newIndex = (currentImageIndex - 1 + account.images.length) % account.images.length;
    this.setData({ currentImageIndex: newIndex });
  },

  /**
   * 下一张图片
   */
  onNextImage() {
    const { account, currentImageIndex } = this.data;
    const newIndex = (currentImageIndex + 1) % account.images.length;
    this.setData({ currentImageIndex: newIndex });
  },

  /**
   * 预览图片
   */
  onImagePreview(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current
    });
  },

  /**
   * 点击立即租赁
   */
  onRentNow() {
    const userInfo = storage.getUserInfo();

    if (!userInfo) {
      // 显示登录弹窗，不跳转
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.showLoginModal === 'function') {
        currentPage.showLoginModal();
      }
      return;
    }

    const { account } = this.data;

    // 检查账号状态
    if (account.status !== 'available') {
      wx.showToast({
        title: '账号当前不可租',
        icon: 'none'
      });
      return;
    }

    // 跳转到订单创建页面
    wx.navigateTo({
      url: `/pages/order/create/index?accountId=${account.id}`
    });
  },

  /**
   * 点击联系客服
   */
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '是否前往客服聊天？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/chat/index?service=1'
          });
        }
      }
    });
  },

  /**
   * 点击收藏
   */
  onFavorite() {
    const { account } = this.data;
    // TODO: 实现收藏功能
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 显示登录弹窗
   */
  showLoginModal() {
    this.setData({ showLoginModal: true });
  },

  /**
   * 登录成功回调
   */
  onLoginSuccess(e) {
    console.log('账号详情页收到登录成功事件:', e.detail);
    this.setData({ showLoginModal: false });
    // 重新加载账号详情
    this.loadAccountDetail();
  }
});
