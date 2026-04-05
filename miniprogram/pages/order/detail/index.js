const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');
const orderTransformer = require('../../../utils/order-transformer.js');

function buildAccountFromOrder(orderData = {}) {
  return {
    id: orderData.accountId || orderData.account_id || '',
    title: orderData.accountName || orderData.account_name || '游戏账号',
    avatar: orderData.accountImage || orderData.account_image || '/images/default-account.png',
    gameAccount: orderData.username || orderData.gameAccount || '',
    gamePassword: orderData.password || orderData.gamePassword || '',
    gameVerify: orderData.verifyCode || orderData.gameVerify || '',
    coinsM: Number(orderData.coinsM || 0),
    safeboxCount: Number(orderData.safeboxCount || 0),
    staminaValue: Number(orderData.staminaValue || 0),
    energyValue: Number(orderData.energyValue || 0),
    tags: Array.isArray(orderData.tags) ? orderData.tags.filter(Boolean) : [],
  };
}

function normalizeAccount(account = {}) {
  const coinsM = Number(account.coinsM || 0);
  const safeboxCount = Number(account.safeboxCount || 0);
  const staminaValue = Number(account.staminaValue || 0);
  const energyValue = Number(account.energyValue || 0);

  return {
    ...account,
    id: account.id || '',
    title: account.title || '游戏账号',
    avatar: account.avatar || '/images/default-account.png',
    tags: Array.isArray(account.tags) ? account.tags.filter(Boolean) : [],
    summaryList: [
      coinsM > 0 ? `${coinsM}M 哈夫币` : '',
      safeboxCount > 0 ? `${safeboxCount} 格保险箱` : '',
      staminaValue > 0 ? `${staminaValue} 体力` : '',
      energyValue > 0 ? `${energyValue} 负重` : '',
    ].filter(Boolean),
  };
}

function buildOrderInfoRows(order = {}) {
  return [
    { label: '订单编号', value: order.order_number || '-', copyValue: order.order_number || '' },
    { label: '下单时间', value: order.created_at || '-' },
    { label: '租期', value: order.rental_period || '-' },
    { label: '订单总额', value: `¥${order.total_price || '0.00'}`, highlight: true },
    { label: '费用明细', value: `租金 ¥${order.rental_price || '0.00'} + 押金 ¥${order.deposit || '0.00'}` },
  ];
}

function buildRentRows(order = {}) {
  const rows = [];
  if (order.rental_start && order.rental_start !== '-') {
    rows.push({ label: '开始时间', value: order.rental_start });
  }
  if (order.rental_end && order.rental_end !== '-') {
    rows.push({ label: '结束时间', value: order.rental_end });
  }
  return rows;
}

function buildGameAccountRows(account = {}) {
  const rows = [];
  if (account.gameAccount) {
    rows.push({ label: '账号', value: account.gameAccount, copyValue: account.gameAccount });
  }
  if (account.gamePassword) {
    rows.push({ label: '密码', value: account.gamePassword, copyValue: account.gamePassword, masked: true });
  }
  if (account.gameVerify) {
    rows.push({ label: '验证码', value: account.gameVerify, copyValue: account.gameVerify });
  }
  return rows;
}

function buildPaymentRows(order = {}) {
  if (!order.payment_time || order.payment_time === '-') {
    return [];
  }

  return [
    { label: '支付时间', value: order.payment_time },
  ];
}

Page({
  data: {
    orderId: null,
    order: {},
    account: {},
    orderStatusKey: 'pending',
    statusIcon: '待',
    statusDesc: '',
    showGameAccount: false,
    actions: [],
    loading: false,
    orderInfoRows: [],
    rentRows: [],
    gameAccountRows: [],
    paymentRows: [],
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
    if (this.data.loading) {
      return Promise.resolve();
    }

    this.setData({ loading: true });

    return api.getOrderDetail(this.data.orderId)
      .then((res) => {
        const source = res?.data || {};
        const orderSource = source.order || source;
        const transformedOrder = orderTransformer.transformOrder(orderSource) || {};
        const accountSource = source.account || buildAccountFromOrder(orderSource);
        const account = normalizeAccount(accountSource);

        this.setData({
          order: transformedOrder,
          account,
          orderInfoRows: buildOrderInfoRows(transformedOrder),
          rentRows: buildRentRows(transformedOrder),
          gameAccountRows: buildGameAccountRows(account),
          paymentRows: buildPaymentRows(transformedOrder),
        });

        this.updateOrderStatus();
      })
      .catch((error) => {
        console.error('加载订单详情失败:', error);

        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const mockOrder = mockData.orders?.find((item) => item.id === this.data.orderId) || mockData.orders?.[0];
          if (mockOrder) {
            const transformedOrder = orderTransformer.transformOrder(mockOrder) || {};
            const account = normalizeAccount(buildAccountFromOrder(mockOrder));
            this.setData({
              order: transformedOrder,
              account,
              orderInfoRows: buildOrderInfoRows(transformedOrder),
              rentRows: buildRentRows(transformedOrder),
              gameAccountRows: buildGameAccountRows(account),
              paymentRows: buildPaymentRows(transformedOrder),
            });
            this.updateOrderStatus();
            return;
          }
        }

        wx.showToast({
          title: error.error || '加载失败，请稍后重试',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  updateOrderStatus() {
    const order = this.data.order || {};
    const account = this.data.account || {};
    const statusConfig = {
      pending_payment: {
        key: 'pending',
        icon: '待',
        desc: '请尽快完成支付，超时后订单会自动取消。',
        showGameAccount: false,
        actions: [
          { action: 'cancel', text: '取消订单', type: 'danger' },
          { action: 'pay', text: '立即支付', type: 'primary' },
        ],
      },
      active: {
        key: 'active',
        icon: '租',
        desc: '账号租赁进行中，请按约定时间使用并按时归还。',
        showGameAccount: true,
        actions: [
          { action: 'chat', text: '联系卖家', type: 'outline' },
          { action: 'complete', text: '确认归还', type: 'primary' },
        ],
      },
      pending_verification: {
        key: 'pending_verification',
        icon: '验',
        desc: '账号已归还，等待卖家验收。',
        showGameAccount: false,
        actions: [
          { action: 'chat', text: '联系卖家', type: 'outline' },
        ],
      },
      pending_consumption_confirm: {
        key: 'pending_verification',
        icon: '结',
        desc: '等待双方确认最终结算结果。',
        showGameAccount: false,
        actions: [
          { action: 'chat', text: '联系卖家', type: 'outline' },
        ],
      },
      disputed: {
        key: 'dispute',
        icon: '争',
        desc: '订单正在争议处理流程中，请及时沟通。',
        showGameAccount: false,
        actions: [
          { action: 'chat', text: '联系卖家', type: 'primary' },
        ],
      },
      completed: {
        key: 'completed',
        icon: '完',
        desc: '订单已完成，欢迎再次租号。',
        showGameAccount: false,
        actions: account.id ? [{ action: 'reorder', text: '再次租号', type: 'outline' }] : [],
      },
      cancelled: {
        key: 'cancelled',
        icon: '关',
        desc: '订单已取消。',
        showGameAccount: false,
        actions: account.id ? [{ action: 'reorder', text: '重新下单', type: 'outline' }] : [],
      },
      refunded: {
        key: 'refunded',
        icon: '退',
        desc: '订单已退款。',
        showGameAccount: false,
        actions: [],
      },
      refunding: {
        key: 'refunded',
        icon: '退',
        desc: '退款处理中，请耐心等待。',
        showGameAccount: false,
        actions: [],
      },
    };

    const current = statusConfig[order.status] || statusConfig.pending_payment;
    this.setData({
      orderStatusKey: current.key,
      statusIcon: current.icon,
      statusDesc: current.desc,
      showGameAccount: current.showGameAccount,
      actions: current.actions,
    });
  },

  copyText(value, successText) {
    if (!value) {
      return;
    }

    wx.setClipboardData({
      data: value,
      success() {
        wx.showToast({ title: successText, icon: 'success' });
      },
    });
  },

  onCopyValue(e) {
    const value = e.currentTarget.dataset.value || '';
    const text = e.currentTarget.dataset.text || '复制成功';
    this.copyText(value, text);
  },

  onAccountTap() {
    if (!this.data.account?.id) {
      return;
    }

    wx.navigateTo({ url: `/pages/account/detail/index?id=${this.data.account.id}` });
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
      title: '确认取消订单',
      content: '取消后当前订单会关闭，如需继续租号可以重新下单。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        this.submitCancel();
      },
    });
  },

  submitCancel() {
    wx.showLoading({ title: '提交中', mask: true });

    api.cancelOrder(this.data.orderId)
      .then(() => {
        wx.showToast({ title: '订单已取消', icon: 'success' });
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
      content: '确认已经结束使用并归还账号后，再提交此操作。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        wx.showLoading({ title: '提交中', mask: true });
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
    if (!this.data.account?.id) {
      return;
    }

    wx.navigateTo({ url: `/pages/account/detail/index?id=${this.data.account.id}` });
  },
});
