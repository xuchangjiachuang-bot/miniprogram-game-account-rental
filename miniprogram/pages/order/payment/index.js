const api = require('../../../utils/api.js');
const navigation = require('../../../utils/navigation.js');

function formatMoney(amount) {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

function normalizeAccount(account = {}, order = {}) {
  return {
    avatar: account.avatar || account.image || account.account_image || '/images/default-account.png',
    title: account.title || account.name || order.accountName || order.account_name || '游戏账号',
  };
}

Page({
  data: {
    orderId: null,
    order: {
      status: '',
      total_price: '0.00',
      totalPrice: '0.00',
      rental_period: '-',
      paymentTimeoutSeconds: 900,
    },
    account: {
      avatar: '/images/default-account.png',
      title: '游戏账号',
    },
    wallet: {
      availableBalance: '0.00',
    },
    selectedPayment: 'balance',
    paying: false,
    countdown: '15:00',
    countdownTimer: null,
    insufficient: false,
    insufficientAmount: '0.00',
    paymentMethods: [],
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '订单 ID 不能为空', icon: 'none' });
      setTimeout(() => navigation.safeNavigateBack({
        fallbackUrl: '/pages/order/list/index',
        fallbackType: 'switchTab',
      }), 1200);
      return;
    }

    this.setData({ orderId: options.id });
    this.loadData();
  },

  onUnload() {
    this.clearCountdown();
  },

  clearCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
  },

  refreshPaymentMethods() {
    const walletBalance = this.data.wallet.availableBalance || '0.00';
    this.setData({
      paymentMethods: [
        {
          key: 'balance',
          shortLabel: '余',
          title: '余额支付',
          desc: `当前可用余额 ¥${walletBalance}`,
          active: this.data.selectedPayment === 'balance',
          disabled: false,
        },
        {
          key: 'wechat',
          shortLabel: '微',
          title: '微信支付',
          desc: '当前订单暂不支持微信直接支付',
          active: false,
          disabled: true,
        },
      ],
    });
  },

  loadData() {
    return Promise.all([
      this.loadOrderDetail(),
      this.loadWalletInfo(),
    ]).catch((error) => {
      console.error('加载支付页数据失败:', error);
    });
  },

  loadOrderDetail() {
    return api.getOrderDetail(this.data.orderId)
      .then((res) => {
        const source = res?.data || {};
        const order = source.order || source;
        const account = normalizeAccount(source.account || {}, order);

        if (order.status && order.status !== 'pending_payment') {
          wx.redirectTo({ url: `/pages/order/detail/index?id=${this.data.orderId}` });
          return;
        }

        const normalizedOrder = {
          ...order,
          totalPrice: formatMoney(order.totalPrice || order.total_price || 0),
          total_price: formatMoney(order.total_price || order.totalPrice || 0),
          rental_period: order.rental_period || '-',
          paymentTimeoutSeconds: Number(order.paymentTimeoutSeconds || 900),
        };

        this.setData({ order: normalizedOrder, account });
        this.startCountdown(normalizedOrder.paymentTimeoutSeconds);
        this.checkBalance();
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '订单信息加载失败', icon: 'none' });
      });
  },

  loadWalletInfo() {
    return api.getWalletInfo()
      .then((res) => {
        const wallet = res?.data || {};
        this.setData({
          wallet: {
            availableBalance: formatMoney(wallet.availableBalance || wallet.available_balance || 0),
          },
        });
        this.checkBalance();
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '钱包信息加载失败', icon: 'none' });
      });
  },

  checkBalance() {
    const balance = Number(this.data.wallet.availableBalance || 0);
    const amount = Number(this.data.order.totalPrice || this.data.order.total_price || 0);
    const insufficient = amount > balance;

    this.setData({
      insufficient,
      insufficientAmount: insufficient ? formatMoney(amount - balance) : '0.00',
    });
    this.refreshPaymentMethods();
  },

  startCountdown(totalSeconds) {
    this.clearCountdown();

    let seconds = Number(totalSeconds || 900);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      seconds = 900;
    }

    const updateCountdown = () => {
      if (seconds <= 0) {
        this.clearCountdown();
        this.setData({ countdown: '00:00' });
        wx.showToast({ title: '订单已超时', icon: 'none' });
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order/detail/index?id=${this.data.orderId}` });
        }, 1200);
        return;
      }

      const minutes = Math.floor(seconds / 60);
      const remainSeconds = seconds % 60;
      this.setData({
        countdown: `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`,
      });
      seconds -= 1;
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    this.setData({ countdownTimer: timer });
  },

  onPaymentTap(e) {
    const payment = e.currentTarget.dataset.payment;
    if (payment === 'wechat') {
      wx.showToast({ title: '当前订单暂不支持微信直接支付', icon: 'none' });
      return;
    }

    this.setData({ selectedPayment: 'balance' });
    this.refreshPaymentMethods();
  },

  onRecharge() {
    wx.navigateTo({ url: '/pages/wallet/recharge/index' });
  },

  onPay() {
    if (this.data.paying) {
      return;
    }

    if (this.data.insufficient) {
      wx.showToast({ title: '余额不足，请先充值', icon: 'none' });
      return;
    }

    this.handleBalancePay();
  },

  handleBalancePay() {
    this.setData({ paying: true });

    api.balancePay(this.data.orderId)
      .then(() => {
        wx.showToast({ title: '支付成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order/detail/index?id=${this.data.orderId}` });
        }, 1200);
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '支付失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ paying: false });
      });
  },
});
