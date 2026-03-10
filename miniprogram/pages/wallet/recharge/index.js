// pages/wallet/recharge/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    wallet: {
      balance: '0.00'
    },
    amountOptions: [
      { value: 10, gift: 0 },
      { value: 50, gift: 5 },
      { value: 100, gift: 15 },
      { value: 200, gift: 40 },
      { value: 500, gift: 120 },
      { value: 1000, gift: 300 }
    ],
    selectedAmount: null,
    customAmount: '',
    paymentMethod: 'wechat',
    giftAmount: 0,
    paying: false
  },

  onLoad(options) {
    console.log('钱包充值页面加载');
    this.loadWalletInfo();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadWalletInfo();
  },

  /**
   * 加载钱包信息
   */
  loadWalletInfo() {
    const that = this;
    
    api.getWalletInfo()
      .then(res => {
        that.setData({
          wallet: {
            balance: that.formatMoney(res.data.balance)
          }
        });
      })
      .catch(error => {
        console.error('加载钱包信息失败:', error);
      });
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 点击金额选项
   */
  onAmountTap(e) {
    const value = parseFloat(e.currentTarget.dataset.value);
    
    this.setData({
      selectedAmount: value,
      customAmount: '',
      giftAmount: this.getGiftAmount(value)
    });
  },

  /**
   * 自定义金额输入
   */
  onCustomAmountInput(e) {
    const value = parseFloat(e.detail.value) || 0;
    
    this.setData({
      selectedAmount: null,
      customAmount: e.detail.value,
      giftAmount: 0 // 自定义金额没有赠送
    });
  },

  /**
   * 获取赠送金额
   */
  getGiftAmount(amount) {
    const option = this.data.amountOptions.find(opt => opt.value === amount);
    return option ? option.gift : 0;
  },

  /**
   * 选择支付方式
   */
  onPaymentMethodTap(e) {
    this.setData({
      paymentMethod: e.currentTarget.dataset.method
    });
  },

  /**
   * 计算最终金额
   */
  get finalAmount() {
    const { selectedAmount, customAmount } = this.data;
    return selectedAmount || parseFloat(customAmount) || 0;
  },

  /**
   * 充值支付
   */
  onPay() {
    const that = this;
    const amount = this.data.finalAmount;
    
    // 验证金额
    if (amount <= 0) {
      wx.showToast({
        title: '请输入充值金额',
        icon: 'none'
      });
      return;
    }
    
    if (amount < 0.01) {
      wx.showToast({
        title: '充值金额不能少于0.01元',
        icon: 'none'
      });
      return;
    }
    
    if (amount > 10000) {
      wx.showToast({
        title: '单次充值不能超过10000元',
        icon: 'none'
      });
      return;
    }
    
    that.setData({ paying: true });
    
    // 创建充值订单
    api.createRechargeOrder({
      amount: amount,
      paymentMethod: that.data.paymentMethod
    })
    .then(res => {
      const order = res.data;
      
      // 调起微信支付
      return that.requestPayment(order);
    })
    .then(() => {
      that.setData({ paying: false });
      
      wx.showToast({
        title: '充值成功',
        icon: 'success'
      });
      
      // 刷新余额
      setTimeout(() => {
        that.loadWalletInfo();
        wx.navigateBack();
      }, 1500);
    })
    .catch(error => {
      console.error('充值失败:', error);
      that.setData({ paying: false });
      
      wx.showToast({
        title: error.error || '充值失败',
        icon: 'none'
      });
    });
  },

  /**
   * 请求支付
   */
  requestPayment(order) {
    return new Promise((resolve, reject) => {
      const { paymentParams } = order;
      
      if (!paymentParams) {
        reject({ error: '支付参数获取失败' });
        return;
      }
      
      wx.requestPayment({
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign,
        success(res) {
          console.log('支付成功', res);
          resolve();
        },
        fail(err) {
          console.error('支付失败', err);
          
          if (err.errMsg.indexOf('cancel') > -1) {
            reject({ error: '用户取消支付' });
          } else {
            reject({ error: '支付失败' });
          }
        }
      });
    });
  }
});
