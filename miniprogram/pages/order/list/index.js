// pages/order/list/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const orderTransformer = require('../../../utils/order-transformer.js');

Page({
  data: {
    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'pending_payment', name: '待付款', count: 0 },
      { key: 'pending_start', name: '待开始', count: 0 },
      { key: 'renting', name: '租赁中', count: 0 },
      { key: 'completed', name: '已完成', count: 0 },
      { key: 'cancelled', name: '已取消', count: 0 }
    ],
    orders: [],
    loading: false
  },

  onLoad(options) {
    console.log('订单列表页面加载', options);

    // 如果有tab参数，切换到对应标签
    if (options.tab) {
      this.setData({ currentTab: options.tab });
    }

    // 检查登录状态
    const userInfo = storage.getUserInfo();
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 加载订单列表
    this.loadOrders();
  },

  onShow() {
    // 页面显示时刷新订单列表
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载订单列表
   */
  loadOrders() {
    const that = this;

    if (that.data.loading) return;

    that.setData({ loading: true });

    api.getOrders({
      status: that.data.currentTab === 'all' ? undefined : that.data.currentTab
    })
    .then(res => {
      const { data } = res;
      const orders = data.list || [];

      // 使用数据转换工具处理订单数据
      const processedOrders = orderTransformer.transformOrderList(orders);

      // 更新标签计数
      const tabs = [...that.data.tabs];
      tabs.forEach(tab => {
        const count = data.counts && data.counts[tab.key] ? data.counts[tab.key] : 0;
        tab.count = count;
      });

      that.setData({
        orders: processedOrders,
        tabs,
        loading: false
      });
    })
    .catch(error => {
      console.error('加载订单列表失败:', error);
      that.setData({ loading: false });

      // 使用Mock数据
      if (config.useMockData) {
        const mockData = require('../../../utils/mock-data.js');
        const orders = mockData.orders || [];

        // 处理订单数据
        const processedOrders = orderTransformer.transformOrderList(orders);

        that.setData({
          orders: processedOrders,
          loading: false
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
   * 切换标签
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;

    if (tab === this.data.currentTab) return;

    this.setData({ currentTab: tab });
    this.loadOrders();
  },

  /**
   * 点击订单
   */
  onOrderTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${id}`
    });
  },

  /**
   * 点击操作按钮
   */
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
        this.enterChat(id);
        break;
      case 'extend':
        this.extendOrder(id);
        break;
      case 'appeal':
        this.appealOrder(id);
        break;
    }
  },

  /**
   * 支付订单
   */
  payOrder(orderId) {
    wx.navigateTo({
      url: `/pages/order/payment/index?id=${orderId}`
    });
  },

  /**
   * 取消订单
   */
  cancelOrder(orderId) {
    const that = this;

    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success(res) {
        if (res.confirm) {
          that.doCancelOrder(orderId);
        }
      }
    });
  },

  /**
   * 执行取消订单
   */
  doCancelOrder(orderId) {
    const that = this;

    wx.showLoading({ title: '取消中...' });

    api.cancelOrder(orderId)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '订单已取消',
          icon: 'success'
        });
        that.loadOrders();
      })
      .catch(error => {
        wx.hideLoading();
        wx.showToast({
          title: error.error || '取消失败',
          icon: 'none'
        });
      });
  },

  /**
   * 进入聊天
   */
  enterChat(orderId) {
    wx.navigateTo({
      url: `/pages/chat/index?orderId=${orderId}`
    });
  },

  /**
   * 续租订单
   */
  extendOrder(orderId) {
    wx.navigateTo({
      url: `/pages/order/extend/index?id=${orderId}`
    });
  },

  /**
   * 申诉订单
   */
  appealOrder(orderId) {
    wx.navigateTo({
      url: `/pages/order/appeal/index?id=${orderId}`
    });
  },

  /**
   * 去首页
   */
  onGoHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
