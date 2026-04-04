// pages/order/list/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const orderTransformer = require('../../../utils/order-transformer.js');

const TAB_KEYS = [
  'all',
  'pending_payment',
  'active',
  'pending_verification',
  'completed',
  'cancelled',
  'disputed',
];

Page({
  data: {
    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'pending_payment', name: '待支付', count: 0 },
      { key: 'active', name: '租赁中', count: 0 },
      { key: 'pending_verification', name: '待验收', count: 0 },
      { key: 'completed', name: '已完成', count: 0 },
      { key: 'cancelled', name: '已取消', count: 0 },
      { key: 'disputed', name: '争议中', count: 0 },
    ],
    orders: [],
    loading: false,
  },

  onLoad(options) {
    if (options.tab && TAB_KEYS.includes(options.tab)) {
      this.setData({ currentTab: options.tab });
    }

    const userInfo = storage.getUserInfo();
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  loadOrders() {
    if (this.data.loading) return Promise.resolve();

    this.setData({ loading: true });

    return api.getOrders({
      status: this.data.currentTab === 'all' ? undefined : this.data.currentTab,
    })
      .then((res) => {
        const data = res?.data || {};
        const orders = data.list || data.orders || [];
        const processedOrders = orderTransformer.transformOrderList(orders);
        const totalCount = data.counts
          ? Object.keys(data.counts).reduce((sum, key) => sum + Number(data.counts[key] || 0), 0)
          : processedOrders.length;

        const tabs = this.data.tabs.map((tab) => ({
          ...tab,
          count: tab.key === 'all'
            ? totalCount
            : Number(data?.counts?.[tab.key] || 0),
        }));

        this.setData({
          orders: processedOrders,
          tabs,
          loading: false,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });

        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const orders = orderTransformer.transformOrderList(mockData.orders || []);
          this.setData({ orders });
          return;
        }

        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none',
        });
      });
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    if (!tab || tab === this.data.currentTab) return;

    this.setData({ currentTab: tab });
    this.loadOrders();
  },

  onOrderTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order/detail/index?id=${id}` });
  },

  onActionTap(e) {
    const { action, id } = e.currentTarget.dataset;

    switch (action) {
      case 'pay':
        this.payOrder(id);
        break;
      case 'cancel':
        this.cancelOrder(id);
        break;
      case 'chat':
        this.enterChat();
        break;
      case 'complete':
        this.completeOrder(id);
        break;
      default:
        break;
    }
  },

  payOrder(orderId) {
    wx.navigateTo({ url: `/pages/order/payment/index?id=${orderId}` });
  },

  cancelOrder(orderId) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '取消中...' });
        api.cancelOrder(orderId)
          .then(() => {
            wx.showToast({ title: '订单已取消', icon: 'success' });
            this.loadOrders();
          })
          .catch((error) => {
            wx.showToast({ title: error.error || '取消失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      },
    });
  },

  completeOrder(orderId) {
    wx.showModal({
      title: '确认归还',
      content: '确认已使用完毕并归还账号吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '提交中...' });
        api.completeOrder(orderId)
          .then(() => {
            wx.showToast({ title: '已提交归还', icon: 'success' });
            this.loadOrders();
          })
          .catch((error) => {
            wx.showToast({ title: error.error || '操作失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      },
    });
  },

  enterChat() {
    wx.switchTab({ url: '/pages/chat/list/index' });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
