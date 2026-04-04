const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const dataTransformer = require('../../../utils/data-transformer.js');

Page({
  data: {
    id: '',
    account: {
      images: [],
      skins: [],
      region: {},
    },
    currentImageIndex: 0,
    loading: false,
    creatingOrder: false,
    error: null,
    showLoginModal: false,
  },

  onLoad(options) {
    const { id } = options || {};
    if (!id) {
      wx.showToast({ title: '账号 ID 缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.setData({ id });
    this.loadAccountDetail();
  },

  onShow() {
    if (this.data.id) {
      this.loadAccountDetail();
    }
  },

  onShareAppMessage() {
    const account = this.data.account || {};
    return {
      title: account.fullTitle || '游戏账号租赁',
      path: `/pages/account/detail/index?id=${this.data.id}`,
      imageUrl: (account.images && account.images[0]) || '',
    };
  },

  onPullDownRefresh() {
    this.loadAccountDetail().finally(() => wx.stopPullDownRefresh());
  },

  loadAccountDetail() {
    if (this.data.loading) return Promise.resolve();

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...', mask: true });

    return api.getAccountDetail(this.data.id)
      .then((res) => {
        const account = dataTransformer.transformAccount(res?.data);
        this.setData({
          account,
          currentImageIndex: 0,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        console.error('加载账号详情失败:', error);

        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const source = (mockData.accounts || [])[0];
          if (source) {
            const account = dataTransformer.transformAccount(source);
            this.setData({
              account,
              currentImageIndex: 0,
              loading: false,
              error: null,
            });
            return;
          }
        }

        this.setData({
          loading: false,
          error: error.error || '加载失败',
        });
        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current });
  },

  onPrevImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;

    const newIndex = (this.data.currentImageIndex - 1 + imageCount) % imageCount;
    this.setData({ currentImageIndex: newIndex });
  },

  onNextImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;

    const newIndex = (this.data.currentImageIndex + 1) % imageCount;
    this.setData({ currentImageIndex: newIndex });
  },

  onImagePreview(e) {
    const urls = e.currentTarget.dataset.urls || [];
    const current = e.currentTarget.dataset.current || '';
    if (!Array.isArray(urls) || urls.length === 0) return;

    wx.previewImage({ urls, current });
  },

  onRentNow() {
    if (this.data.creatingOrder) return;

    const userInfo = storage.getUserInfo();
    if (!userInfo) {
      this.setData({ showLoginModal: true });
      return;
    }

    const account = this.data.account || {};
    if (account.status !== 'available') {
      wx.showToast({ title: '当前账号暂不可租', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在创建订单...', mask: true });
    this.setData({ creatingOrder: true });

    const rentHours = Number(account.rental_hours || 0) || 24;

    api.createOrder({
      account_id: account.id,
      rent_hours: rentHours,
    })
      .then((res) => {
        const data = res?.data || {};
        const orderId = data.id || data.orderId;
        if (!orderId) {
          throw new Error('订单创建成功，但未返回订单 ID');
        }

        wx.navigateTo({
          url: `/pages/order/payment/index?id=${orderId}`,
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.error || error.message || '创建订单失败',
          icon: 'none',
        });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ creatingOrder: false });
      });
  },

  onContactService() {
    wx.switchTab({ url: '/pages/chat/list/index' });
  },

  onFavorite() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  showLoginModal() {
    this.setData({ showLoginModal: true });
  },

  onLoginSuccess() {
    this.setData({ showLoginModal: false });
    this.loadAccountDetail();
  },
});
