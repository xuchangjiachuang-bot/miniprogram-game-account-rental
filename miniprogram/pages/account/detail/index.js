const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const dataTransformer = require('../../../utils/data-transformer.js');
const navigation = require('../../../utils/navigation.js');

function buildQuickFacts(account = {}) {
  return [
    { label: '哈夫币', value: account.coins_display || '-', className: 'coins' },
    { label: '出租比例', value: account.ratio_display || '1:35', className: 'ratio' },
    { label: '保险箱', value: account.safebox || '-', className: 'safebox' },
    { label: '账号等级', value: account.account_level ? `Lv.${account.account_level}` : '-', className: 'level' },
  ];
}

function appendDetailItem(list, label, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  const text = String(value).trim();
  if (!text || text === '-' || text === '0' || text === '0.00' || text === '0/0') {
    return;
  }

  list.push({ label, value: text });
}

function buildDetailItems(account = {}) {
  const list = [];

  appendDetailItem(list, '段位', account.rank_display);
  appendDetailItem(list, '体力 / 负重', `${account.stamina_level || '-'} / ${account.load_level || '-'}`);
  appendDetailItem(list, 'KD', account.kd);
  appendDetailItem(list, 'AWM 子弹', account.awmBullets);
  appendDetailItem(list, '六级甲', account.level6Armor);
  appendDetailItem(list, '六级头', account.level6Helmet);
  appendDetailItem(list, '地区', `${account.region?.province || '-'} ${account.region?.city || ''}`.trim());
  appendDetailItem(list, '浏览次数', account.view_count);
  appendDetailItem(list, '成交次数', account.trade_count);
  appendDetailItem(list, '上架时间', account.listed_at);

  return list;
}

function buildPriceRows(account = {}) {
  return [
    { label: '租金', value: account.actual_rental || '0.00', displayValue: `¥${account.actual_rental || '0.00'}` },
    { label: '押金', value: account.deposit || '0.00', displayValue: `¥${account.deposit || '0.00'}` },
    { label: '租期', value: account.rental_description || '-', displayValue: account.rental_description || '-' },
    { label: '合计', value: account.total_price || '0.00', displayValue: `¥${account.total_price || '0.00'}`, highlight: true },
  ];
}

function normalizeAccount(account = {}) {
  const images = Array.isArray(account.images) && account.images.length > 0
    ? account.images
    : ['/images/default-account.png'];

  return {
    ...account,
    images,
    fullTitle: account.fullTitle || account.title || account.account_name || '游戏账号',
    subtitle: account.account_name || '平台担保发号，支持快速租赁',
    login_method: account.login_method || '未知登录方式',
    statusText: account.statusText || '可出租',
    description: account.description || '卖家暂未补充描述，可先查看属性、皮肤标签与租期后再决定是否下单。',
  };
}

Page({
  data: {
    id: '',
    account: {
      images: [],
      region: {},
      skins: [],
      tagPreview: [],
    },
    currentImageIndex: 0,
    loading: false,
    creatingOrder: false,
    error: null,
    quickFacts: [],
    detailItems: [],
    priceRows: [],
    showLoginModal: false,
  },

  onLoad(options) {
    const { id } = options || {};
    if (!id) {
      wx.showToast({ title: '账号 ID 缺失', icon: 'none' });
      setTimeout(() => navigation.safeNavigateBack({
        fallbackUrl: '/pages/index/index',
        fallbackType: 'switchTab',
      }), 1200);
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

  applyAccount(source) {
    const account = normalizeAccount(source);
    this.setData({
      account,
      currentImageIndex: 0,
      error: null,
      quickFacts: buildQuickFacts(account),
      detailItems: buildDetailItems(account),
      priceRows: buildPriceRows(account),
    });
  },

  loadAccountDetail() {
    if (this.data.loading) {
      return Promise.resolve();
    }

    this.setData({ loading: true, error: null });
    wx.showLoading({ title: '加载中', mask: true });

    return api.getAccountDetail(this.data.id)
      .then((res) => {
        const account = dataTransformer.transformAccount(res?.data);
        this.applyAccount(account || {});
      })
      .catch((error) => {
        console.error('加载账号详情失败:', error);

        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const source = (mockData.accounts || [])[0];
          if (source) {
            this.applyAccount(dataTransformer.transformAccount(source) || {});
            return;
          }
        }

        this.setData({
          error: error.error || '加载失败，请稍后重试',
        });
        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
        wx.hideLoading();
      });
  },

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current });
  },

  onPrevImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;

    const nextIndex = (this.data.currentImageIndex - 1 + imageCount) % imageCount;
    this.setData({ currentImageIndex: nextIndex });
  },

  onNextImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;

    const nextIndex = (this.data.currentImageIndex + 1) % imageCount;
    this.setData({ currentImageIndex: nextIndex });
  },

  onImagePreview(e) {
    const urls = e.currentTarget.dataset.urls || [];
    const current = e.currentTarget.dataset.current || '';
    if (!Array.isArray(urls) || urls.length === 0) {
      return;
    }

    wx.previewImage({ urls, current });
  },

  onRentNow() {
    if (this.data.creatingOrder) {
      return;
    }

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

    wx.showLoading({ title: '创建订单中', mask: true });
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
          throw new Error('订单创建成功，但未返回订单编号');
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
    wx.showToast({ title: '收藏功能即将上线', icon: 'none' });
  },

  onLoginSuccess() {
    this.setData({ showLoginModal: false });
    this.loadAccountDetail();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  onRetry() {
    this.loadAccountDetail();
  },
});
