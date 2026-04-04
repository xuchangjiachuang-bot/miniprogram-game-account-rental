const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');
const orderTransformer = require('../../../utils/order-transformer.js');

function buildAccountFromOrder(orderData = {}) {
  return {
    id: orderData.accountId || orderData.account_id,
    title: orderData.accountName || orderData.account_name || '游戏账号',
    avatar: orderData.accountImage || orderData.account_image || '/images/default-account.png',
    gameAccount: orderData.username || orderData.gameAccount || '',
    gamePassword: orderData.password || orderData.gamePassword || '',
    gameVerify: orderData.verifyCode || orderData.gameVerify || '',
    coinsM: Number(orderData.coinsM || 0),
    safeboxCount: Number(orderData.safeboxCount || 0),
    staminaValue: Number(orderData.staminaValue || 0),
    energyValue: Number(orderData.energyValue || 0),
    customAttributes: orderData.customAttributes || {},
    tags: Array.isArray(orderData.tags) ? orderData.tags : [],
  };
}

Page({
  data: {
    orderId: null,
    order: {},
    account: {},
    orderStatusKey: '',
    statusIcon: '',
    statusDesc: '',
    showGameAccount: false,
    canChat: false,
    actions: [],
    loading: false,
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '订单 ID 不能为空', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.setData({ orderId: options.id });
    this.loadData();
  },

  onShow() {
    if (this.data.orderId) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  loadData() {
    if (this.data.loading) return Promise.resolve();

    this.setData({ loading: true });

    return api.getOrderDetail(this.data.orderId)
      .then((res) => {
        const source = res?.data || {};
        const orderData = source.order || source;
        const transformedOrder = orderTransformer.transformOrder(orderData);
        const account = source.account || buildAccountFromOrder(orderData);

        this.setData({
          order: transformedOrder || {},
          account,
        });

        this.updateOrderStatus();
      })
      .catch((error) => {
        console.error('加载订单详情失败:', error);

        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const mockOrder = mockData.orders?.find((item) => item.id === this.data.orderId) || mockData.orders?.[0];
          if (mockOrder) {
            this.setData({
              order: orderTransformer.transformOrder(mockOrder),
              account: buildAccountFromOrder(mockOrder),
            });
            this.updateOrderStatus();
            return;
          }
        }

        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  updateOrderStatus() {
    const status = this.data.order?.status;
    const statusConfig = {
      pending_payment: {
        key: 'pending',
        icon: '付',
        desc: '请尽快完成支付，超时后订单会自动取消。',
        showGameAccount: false,
        canChat: false,
        actions: [
          { action: 'cancel', text: '取消订单', type: 'danger' },
          { action: 'pay', text: '立即支付', type: 'primary' },
        ],
      },
      active: {
        key: 'active',
        icon: '租',
        desc: '订单正在租赁中，请按约定时间使用账号。',
        showGameAccount: true,
        canChat: true,
        actions: [
          { action: 'chat', text: '进入聊天', type: 'outline' },
          { action: 'complete', text: '归还账号', type: 'primary' },
        ],
      },
      pending_verification: {
        key: 'pending_verification',
        icon: '验',
        desc: '账号已归还，等待卖家验收。',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'chat', text: '联系卖家', type: 'outline' },
        ],
      },
      pending_consumption_confirm: {
        key: 'pending_verification',
        icon: '结',
        desc: '等待双方确认结算。',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'chat', text: '沟通结算', type: 'outline' },
        ],
      },
      disputed: {
        key: 'dispute',
        icon: '争',
        desc: '订单正在争议处理流程中。',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'chat', text: '协商处理', type: 'primary' },
        ],
      },
      completed: {
        key: 'completed',
        icon: '完',
        desc: '订单已完成。',
        showGameAccount: false,
        canChat: false,
        actions: [],
      },
      cancelled: {
        key: 'cancelled',
        icon: '关',
        desc: '订单已取消。',
        showGameAccount: false,
        canChat: false,
        actions: [],
      },
      refunded: {
        key: 'refunded',
        icon: '退',
        desc: '订单已退款。',
        showGameAccount: false,
        canChat: false,
        actions: [],
      },
      refunding: {
        key: 'refunded',
        icon: '退',
        desc: '退款处理中。',
        showGameAccount: false,
        canChat: false,
        actions: [],
      },
    };

    const current = statusConfig[status] || statusConfig.pending_payment;
    this.setData({
      orderStatusKey: current.key,
      statusIcon: current.icon,
      statusDesc: current.desc,
      showGameAccount: current.showGameAccount,
      canChat: current.canChat,
      actions: current.actions,
    });
  },

  onCopyOrderNo() {
    const value = this.data.order?.order_number || '';
    if (!value) return;

    wx.setClipboardData({
      data: value,
      success() {
        wx.showToast({ title: '订单号已复制', icon: 'success' });
      },
    });
  },

  onAccountTap() {
    if (!this.data.account?.id) return;
    wx.navigateTo({ url: `/pages/account/detail/index?id=${this.data.account.id}` });
  },

  onCopyAccount(e) {
    const account = e.currentTarget.dataset.account;
    if (!account) return;

    wx.setClipboardData({
      data: account,
      success() {
        wx.showToast({ title: '账号已复制', icon: 'success' });
      },
    });
  },

  onCopyPassword(e) {
    const password = e.currentTarget.dataset.password;
    if (!password) return;

    wx.setClipboardData({
      data: password,
      success() {
        wx.showToast({ title: '密码已复制', icon: 'success' });
      },
    });
  },

  onChat() {
    wx.switchTab({ url: '/pages/chat/list/index' });
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'pay':
        this.handlePay();
        break;
      case 'cancel':
        this.handleCancel();
        break;
      case 'complete':
        this.handleComplete();
        break;
      case 'chat':
        this.onChat();
        break;
      case 'reorder':
        this.handleReorder();
        break;
      default:
        break;
    }
  },

  handlePay() {
    wx.navigateTo({ url: `/pages/order/payment/index?id=${this.data.orderId}` });
  },

  handleCancel() {
    wx.showModal({
      title: '确认取消',
      content: '取消后当前订单会关闭，确认继续吗？',
      success: (res) => {
        if (!res.confirm) return;
        this.submitCancel();
      },
    });
  },

  submitCancel() {
    wx.showLoading({ title: '提交中...' });

    api.cancelOrder(this.data.orderId)
      .then(() => {
        wx.showToast({ title: '操作成功', icon: 'success' });
        setTimeout(() => this.loadData(), 1200);
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '操作失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  handleComplete() {
    wx.showModal({
      title: '确认归还账号',
      content: '确认已经结束使用并归还账号吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '提交中...' });
        api.completeOrder(this.data.orderId)
          .then(() => {
            wx.showToast({ title: '已提交归还', icon: 'success' });
            setTimeout(() => this.loadData(), 1200);
          })
          .catch((error) => {
            wx.showToast({ title: error.error || '操作失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      },
    });
  },

  handleReorder() {
    if (!this.data.account?.id) return;
    wx.navigateTo({ url: `/pages/account/detail/index?id=${this.data.account.id}` });
  },
});
