const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const mockData = require('../../../utils/mock-data.js');
const dataTransformer = require('../../../utils/data-transformer.js');
const navigation = require('../../../utils/navigation.js');

const DEFAULT_ACCOUNT_IMAGE = dataTransformer.DEFAULT_ACCOUNT_IMAGE || '/images/default-account.png';

function buildQuickFacts(account = {}) {
  return [
    { label: '哈夫币', value: account.coins_display || '-', className: 'coins' },
    { label: '出租比例', value: account.ratio_display || '1:35', className: 'ratio' },
    { label: '安全箱', value: account.safebox || '-', className: 'safebox' },
    { label: '账号等级', value: account.account_level ? `Lv.${account.account_level}` : '-', className: 'level' },
  ];
}

function appendDetailItem(list, label, value) {
  if (value === undefined || value === null || value === '') return;
  const text = String(value).trim();
  if (!text || text === '-' || text === '0' || text === '0.00' || text === '0/0') return;
  list.push({ label, value: text });
}

function buildDetailItems(account = {}) {
  const list = [];
  appendDetailItem(list, '平台', account.platformText);
  appendDetailItem(list, '登录方式', account.login_method);
  appendDetailItem(list, '段位', account.rank_display);
  appendDetailItem(list, '体力 / 负重', `${account.stamina_level || '-'} / ${account.load_level || '-'}`);
  appendDetailItem(list, 'KD', account.kd);
  appendDetailItem(list, '可上号时间', account.availableTimeText);
  appendDetailItem(list, 'AWM 子弹', account.awmBullets);
  appendDetailItem(list, '六级甲', account.level6Armor);
  appendDetailItem(list, '六级头', account.level6Helmet);
  appendDetailItem(list, '地区', account.regionText);
  appendDetailItem(list, '浏览次数', account.view_count);
  appendDetailItem(list, '成交次数', account.trade_count);
  appendDetailItem(list, '上架时间', account.listed_at);
  return list;
}

function buildPriceRows(account = {}) {
  return [
    { label: '租金', displayValue: `¥${account.actual_rental || '0.00'}`, rowClassName: '' },
    { label: '押金', displayValue: `¥${account.deposit || '0.00'}`, rowClassName: '' },
    { label: '租期', displayValue: account.rental_description || '-', rowClassName: '' },
    { label: '合计', displayValue: `¥${account.total_price || '0.00'}`, rowClassName: 'total' },
  ];
}

function buildGalleryIndicators(images = [], currentIndex = 0) {
  return images.map((_, index) => ({
    id: `indicator_${index}`,
    className: index === currentIndex ? 'active' : '',
  }));
}

function normalizeAccount(account = {}) {
  const images = Array.isArray(account.images) && account.images.length > 0 ? account.images : [DEFAULT_ACCOUNT_IMAGE];
  return {
    ...account,
    images,
    fullTitle: account.fullTitle || account.title || account.account_name || '游戏账号',
    subtitle: account.regionText || account.account_name || '平台担保发号，支持快速租用',
    login_method: account.login_method || '未知登录方式',
    statusText: account.statusText || '可出租',
    description: account.description || '卖家暂未补充描述，可先查看属性、皮肤标签与租期后再决定是否下单。',
  };
}

Page({
  data: {
    id: '',
    account: {
      id: '',
      images: [DEFAULT_ACCOUNT_IMAGE],
      region: {},
      skins: [],
      tagPreview: [],
    },
    currentImageIndex: 0,
    imageCounterText: '1 / 1',
    galleryIndicators: [],
    hasImages: true,
    showGalleryControls: false,
    hasDetailItems: false,
    hasSkins: false,
    showErrorState: false,
    showInitialLoading: false,
    canRent: false,
    loading: false,
    creatingOrder: false,
    error: '',
    quickFacts: [],
    detailItems: [],
    priceRows: [],
    showLoginModal: false,
  },

  onLoad(options) {
    const id = options && options.id ? options.id : '';
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

  onPullDownRefresh() {
    this.loadAccountDetail().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const account = this.data.account || {};
    return {
      title: account.fullTitle || '游戏账号租赁',
      path: `/pages/account/detail/index?id=${this.data.id}`,
      imageUrl: (account.images && account.images[0]) || DEFAULT_ACCOUNT_IMAGE,
    };
  },

  syncStateFlags(account, errorText, loading) {
    const images = account && Array.isArray(account.images) && account.images.length > 0 ? account.images : [DEFAULT_ACCOUNT_IMAGE];
    const detailItems = this.data.detailItems || [];
    const skins = account && Array.isArray(account.skins) ? account.skins : [];
    const hasAccountContent = Boolean(account && (account.id || images.length));

    this.setData({
      hasImages: images.length > 0,
      showGalleryControls: images.length > 1,
      hasDetailItems: detailItems.length > 0,
      hasSkins: skins.length > 0,
      showErrorState: Boolean(errorText) && !loading,
      showInitialLoading: Boolean(loading) && !hasAccountContent,
      canRent: account && account.status === 'available',
    });
  },

  updateGalleryState(account, index) {
    const images = account && Array.isArray(account.images) && account.images.length > 0 ? account.images : [DEFAULT_ACCOUNT_IMAGE];
    const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
    this.setData({
      currentImageIndex: safeIndex,
      imageCounterText: `${safeIndex + 1} / ${images.length}`,
      galleryIndicators: buildGalleryIndicators(images, safeIndex),
    });
    this.syncStateFlags(account, this.data.error, this.data.loading);
  },

  applyAccount(source) {
    const account = normalizeAccount(source);
    const detailItems = buildDetailItems(account);
    this.setData({
      account,
      error: '',
      quickFacts: buildQuickFacts(account),
      detailItems,
      priceRows: buildPriceRows(account),
    });
    this.updateGalleryState(account, 0);
  },

  loadAccountDetail() {
    if (!this.data.id) {
      return Promise.resolve();
    }

    if (this.data.loading) {
      return Promise.resolve();
    }

    this.setData({ loading: true, error: '' });
    this.syncStateFlags(this.data.account, '', true);

    return api.getAccountDetail(this.data.id)
      .then((res) => {
        const account = dataTransformer.transformAccount(res && res.data ? res.data : null);
        this.applyAccount(account || {});
      })
      .catch((error) => {
        console.error('加载账号详情失败:', error);

        if (config.useMockData) {
          const source = (mockData.accounts || []).find((item) => String(item.id) === String(this.data.id)) || (mockData.accounts || [])[0];
          if (source) {
            this.applyAccount(dataTransformer.transformAccount(source) || {});
            return;
          }
        }

        const errorText = (error && error.error) || '账号详情加载失败，请稍后重试。';
        this.setData({ error: errorText });
        this.syncStateFlags(this.data.account, errorText, false);
      })
      .finally(() => {
        this.setData({ loading: false });
        this.syncStateFlags(this.data.account, this.data.error, false);
      });
  },

  onSwiperChange(e) {
    const nextIndex = Number(e.detail.current || 0);
    this.updateGalleryState(this.data.account, nextIndex);
  },

  onGalleryImageError(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const images = (this.data.account.images || []).slice();
    images[index] = DEFAULT_ACCOUNT_IMAGE;
    const account = {
      ...this.data.account,
      images,
    };
    this.setData({ account });
    this.updateGalleryState(account, this.data.currentImageIndex);
  },

  onPrevImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;
    const nextIndex = (this.data.currentImageIndex - 1 + imageCount) % imageCount;
    this.updateGalleryState(this.data.account, nextIndex);
  },

  onNextImage() {
    const imageCount = (this.data.account.images || []).length;
    if (imageCount <= 1) return;
    const nextIndex = (this.data.currentImageIndex + 1) % imageCount;
    this.updateGalleryState(this.data.account, nextIndex);
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

    wx.showLoading({ title: '创建订单中', mask: true });
    this.setData({ creatingOrder: true });

    const rentHours = Number(account.rental_hours || account.rental_duration || 24) || 24;
    api.createOrder({ account_id: account.id, rent_hours: rentHours })
      .then((res) => {
        const data = res && res.data ? res.data : {};
        const orderId = data.id || data.orderId;
        if (!orderId) {
          throw new Error('订单创建成功，但未返回订单编号');
        }
        wx.navigateTo({ url: `/pages/order/payment/index?id=${orderId}` });
      })
      .catch((error) => {
        wx.showToast({
          title: (error && (error.error || error.message)) || '创建订单失败',
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
