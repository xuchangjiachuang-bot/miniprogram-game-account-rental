const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

Page({
  data: {
    wallet: {
      balance: '0.00',
    },
    amountOptions: [
      { value: 10, gift: 0 },
      { value: 50, gift: 5 },
      { value: 100, gift: 15 },
      { value: 200, gift: 40 },
      { value: 500, gift: 120 },
      { value: 1000, gift: 300 },
    ],
    selectedAmount: null,
    customAmount: '',
    paymentMethod: 'wechat',
    giftAmount: 0,
    finalAmount: 0,
    paying: false,
  },

  onLoad() {
    this.loadWalletInfo();
  },

  onShow() {
    this.loadWalletInfo();
  },

  loadWalletInfo() {
    return api.getWalletInfo()
      .then((res) => {
        const data = res && res.data ? res.data : {};
        this.setData({
          wallet: {
            balance: formatMoney(data.balance || data.availableBalance || data.available_balance || 0),
          },
        });
      })
      .catch((error) => {
        console.error('加载钱包信息失败:', error);
        if (config.useMockData) {
          this.setData({
            wallet: { balance: '520.00' },
          });
        }
      });
  },

  updateAmountState(selectedAmount, customAmount, giftAmount) {
    const amount = selectedAmount || Number(customAmount || 0) || 0;
    this.setData({
      selectedAmount,
      customAmount,
      giftAmount,
      finalAmount: amount,
    });
  },

  onAmountTap(e) {
    const value = Number(e.currentTarget.dataset.value || 0);
    const option = this.data.amountOptions.find((item) => item.value === value);
    this.updateAmountState(value, '', option ? option.gift : 0);
  },

  onCustomAmountInput(e) {
    this.updateAmountState(null, e.detail.value, 0);
  },

  onPaymentMethodTap(e) {
    this.setData({
      paymentMethod: e.currentTarget.dataset.method,
    });
  },

  onPay() {
    const amount = Number(this.data.finalAmount || 0);
    if (amount <= 0) {
      wx.showToast({ title: '请输入充值金额', icon: 'none' });
      return;
    }
    if (amount < 0.01) {
      wx.showToast({ title: '充值金额不能少于 0.01 元', icon: 'none' });
      return;
    }
    if (amount > 10000) {
      wx.showToast({ title: '单次充值金额不能超过 10000 元', icon: 'none' });
      return;
    }

    this.setData({ paying: true });

    api.createRechargeOrder({
      amount,
      paymentMethod: this.data.paymentMethod,
    })
      .then((res) => {
        const order = res && res.data ? res.data : {};
        return this.requestPayment(order);
      })
      .then(() => {
        this.setData({ paying: false });
        wx.showToast({ title: '充值成功', icon: 'success' });
        setTimeout(() => {
          this.loadWalletInfo();
          wx.navigateBack();
        }, 1200);
      })
      .catch((error) => {
        console.error('充值失败:', error);
        this.setData({ paying: false });
        wx.showToast({
          title: error && error.error ? error.error : '充值失败',
          icon: 'none',
        });
      });
  },

  requestPayment(order) {
    return new Promise((resolve, reject) => {
      const paymentParams = order.paymentParams;
      if (!paymentParams) {
        if (config.useMockData) {
          resolve();
          return;
        }
        reject({ error: '支付参数获取失败' });
        return;
      }

      wx.requestPayment({
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign,
        success: () => resolve(),
        fail: (err) => {
          if (String(err.errMsg || '').indexOf('cancel') > -1) {
            reject({ error: '你已取消支付' });
            return;
          }
          reject({ error: '支付未完成，请稍后重试' });
        },
      });
    });
  },
});
