// pages/order/list/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'pending_payment', name: '待付款', count: 0 },
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
    
    that.setData({ loading: true });
    
    api.getOrders({
      status: that.data.currentTab === 'all' ? undefined : that.data.currentTab
    })
    .then(res => {
      const { data } = res;
      const orders = data.list || [];
      
      // 处理订单数据
      const processedOrders = orders.map(order => {
        return {
          ...order,
          statusText: that.getStatusText(order.status),
          showActions: that.shouldShowActions(order),
          actions: that.getOrderActions(order)
        };
      });
      
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
      
      wx.showToast({
        title: error.error || '加载失败',
        icon: 'none'
      });
    });
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending_payment': '待付款',
      'pending_start': '待开始',
      'renting': '租赁中',
      'rented': '已结束',
      'dispute': '争议中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  /**
   * 是否显示操作按钮
   */
  shouldShowActions(order) {
    const { status } = order;
    return ['pending_payment', 'pending_start', 'renting', 'dispute'].includes(status);
  },

  /**
   * 获取订单操作
   */
  getOrderActions(order) {
    const { status } = order;
    const actions = [];
    
    switch (status) {
      case 'pending_payment':
        actions.push({ key: 'pay', text: '立即支付' });
        actions.push({ key: 'cancel', text: '取消订单' });
        break;
      case 'pending_start':
        actions.push({ key: 'chat', text: '联系客服' });
        actions.push({ key: 'cancel', text: '取消订单' });
        break;
      case 'renting':
        actions.push({ key: 'chat', text: '进入聊天' });
        actions.push({ key: 'extend', text: '续租' });
        break;
      case 'dispute':
        actions.push({ key: 'chat', text: '协商处理' });
        actions.push({ key: 'appeal', text: '申诉' });
        break;
    }
    
    return actions;
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    
    this.setData({ currentTab: tab });
    this.loadOrders();
  },

  /**
   * 点击订单
   */
  onOrderTap(e) {
    const { order } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${order.id}`
    });
  },

  /**
   * 点击操作按钮
   */
  onActionTap(e) {
    const { action, id } = e.currentTarget.dataset;
    
    switch (action.key) {
      case 'pay':
        this.payOrder(id);
        break;
      case 'cancel':
        this.cancelOrder(id);
        break;
      case 'chat':
        this.openChat(id);
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
          api.cancelOrder(orderId)
            .then(() => {
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              });
              
              that.loadOrders();
            })
            .catch(error => {
              console.error('取消订单失败:', error);
              wx.showToast({
                title: error.error || '取消失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  /**
   * 打开聊天
   */
  openChat(orderId) {
    // 获取订单对应的聊天群ID
    const order = this.data.orders.find(o => o.id === orderId);
    if (order && order.chatGroupId) {
      wx.navigateTo({
        url: `/pages/chat/detail/index?groupId=${order.chatGroupId}`
      });
    }
  },

  /**
   * 续租
   */
  extendOrder(orderId) {
    wx.navigateTo({
      url: `/pages/order/extend/index?id=${orderId}`
    });
  },

  /**
   * 申诉
   */
  appealOrder(orderId) {
    wx.navigateTo({
      url: `/pages/order/appeal/index?id=${orderId}`
    });
  }
});
