// pages/order/payment/index.js
const api = require('../../../utils/api.js');

Page({
  data: {
    orderId: null,
    order: {},
    account: {},
    wallet: {
      availableBalance: '0.00'
    },
    selectedPayment: 'wechat',
    paying: false,
    countdown: '15:00',
    countdownTimer: null,
    insufficient: false,
    insufficientAmount: 0
  },

  onLoad(options) {
    console.log('订单支付页面加载', options);
    
    if (!options.id) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ orderId: options.id });
    this.loadData();
    this.startCountdown();
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 加载数据
   */
  loadData() {
    const that = this;
    
    Promise.all([
      that.loadOrderDetail(),
      that.loadWalletInfo()
    ]).catch(error => {
      console.error('加载数据失败:', error);
    });
  },

  /**
   * 加载订单详情
   */
  loadOrderDetail() {
    const that = this;
    
    return api.getOrderDetail(that.data.orderId)
      .then(res => {
        that.setData({
          order: res.data.order,
          account: res.data.account
        });
        
        // 如果订单已支付或已取消，跳转到订单详情
        if (res.data.order.status !== 'pending') {
          wx.redirectTo({
            url: `/pages/order/detail/index?id=${that.data.orderId}`
          });
        }
      });
  },

  /**
   * 加载钱包信息
   */
  loadWalletInfo() {
    const that = this;
    
    return api.getWalletInfo()
      .then(res => {
        that.setData({
          wallet: {
            availableBalance: that.formatMoney(res.data.availableBalance)
          }
        });
        
        that.checkBalance();
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
   * 检查余额是否充足
   */
  checkBalance() {
    const { wallet, order, selectedPayment } = this.data;
    
    if (selectedPayment === 'balance') {
      const balance = parseFloat(wallet.availableBalance);
      const amount = parseFloat(order.totalPrice);
      const insufficient = amount > balance;
      
      this.setData({
        insufficient,
        insufficientAmount: insufficient ? (amount - balance).toFixed(2) : '0.00'
      });
    }
  },

  /**
   * 倒计时
   */
  startCountdown() {
    const that = this;
    let seconds = 900; // 15分钟
    
    const timer = setInterval(() => {
      seconds--;
      
      if (seconds <= 0) {
        clearInterval(timer);
        that.setData({
          countdown: '00:00'
        });
        
        wx.showToast({
          title: '订单已超时',
          icon: 'none'
        });
        
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order/detail/index?id=${that.data.orderId}`
          });
        }, 1500);
        return;
      }
      
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      
      that.setData({
        countdown: `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      });
    }, 1000);
    
    that.setData({ countdownTimer: timer });
  },

  /**
   * 选择支付方式
   */
  onPaymentTap(e) {
    const payment = e.currentTarget.dataset.payment;
    
    this.setData({ selectedPayment: payment }, () => {
      this.checkBalance();
    });
  },

  /**
   * 去充值
   */
  onRecharge() {
    wx.navigateTo({
      url: '/pages/wallet/recharge/index'
    });
  },

  /**
   * 支付
   */
  onPay() {
    const that = this;
    
    if (that.data.paying) {
      return;
    }
    
    if (that.data.selectedPayment === 'balance' && that.data.insufficient) {
      return;
    }
    
    if (that.data.selectedPayment === 'wechat') {
      that.handleWechatPay();
    } else {
      that.handleBalancePay();
    }
  },

  /**
   * 微信支付
   */
  handleWechatPay() {
    const that = this;
    
    that.setData({ paying: true });
    
    api.wechatPay(that.data.orderId)
      .then(res => {
        that.setData({ paying: false });
        
        const payData = res.data;
        
        // 调起微信支付
        wx.requestPayment({
          timeStamp: payData.timeStamp,
          nonceStr: payData.nonceStr,
          package: payData.package,
          signType: payData.signType,
          paySign: payData.paySign,
          success() {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            });
            
            setTimeout(() => {
              wx.redirectTo({
                url: `/pages/order/detail/index?id=${that.data.orderId}`
              });
            }, 1500);
          },
          fail(error) {
            console.error('支付失败:', error);
            
            if (error.errMsg !== 'requestPayment:fail cancel') {
              wx.showToast({
                title: '支付失败',
                icon: 'none'
              });
            }
          }
        });
      })
      .catch(error => {
        console.error('创建支付订单失败:', error);
        that.setData({ paying: false });
        
        wx.showToast({
          title: error.error || '支付失败',
          icon: 'none'
        });
      });
  },

  /**
   * 余额支付
   */
  handleBalancePay() {
    const that = this;
    
    that.setData({ paying: true });
    
    api.balancePay(that.data.orderId)
      .then(res => {
        that.setData({ paying: false });
        
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order/detail/index?id=${that.data.orderId}`
          });
        }, 1500);
      })
      .catch(error => {
        console.error('余额支付失败:', error);
        that.setData({ paying: false });
        
        wx.showToast({
          title: error.error || '支付失败',
          icon: 'none'
        });
      });
  }
});
