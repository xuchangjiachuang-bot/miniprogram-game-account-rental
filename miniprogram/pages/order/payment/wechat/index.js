// pages/order/payment/wechat/index.js
const api = require('../../../../utils/api.js');
const storage = require('../../../../utils/storage.js');

Page({
  data: {
    orderId: '',
    accountId: '',
    rentalHours: '',
    accountInfo: null,
    totalPrice: '0.00',
    rentalPrice: '0.00',
    deposit: '0.00',
    loading: false
  },

  onLoad(options) {
    console.log('微信支付页面加载', options);
    
    const { orderId, accountId, rentalHours } = options;
    
    if (!orderId || !accountId || !rentalHours) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({
      orderId,
      accountId,
      rentalHours
    });
    
    // 获取账号信息
    this.loadAccountInfo();
  },

  /**
   * 获取账号信息
   */
  loadAccountInfo() {
    const that = this;
    const { accountId, rentalHours } = this.data;
    
    api.getAccountDetail(accountId)
      .then(res => {
        const account = res.data;
        
        // 计算价格
        const rentalPrice = (parseFloat(account.recommendedRental || 0) * (rentalHours / 24)).toFixed(2);
        const deposit = parseFloat(account.deposit || 0).toFixed(2);
        const totalPrice = (parseFloat(rentalPrice) + parseFloat(deposit)).toFixed(2);
        
        that.setData({
          accountInfo: account,
          rentalPrice,
          deposit,
          totalPrice
        });
      })
      .catch(error => {
        wx.showToast({
          title: error.error || '获取账号信息失败',
          icon: 'none'
        });
      });
  },

  /**
   * 发起支付
   */
  onPayment() {
    const { loading, orderId, accountId, rentalHours } = this.data;
    
    if (loading) {
      return;
    }
    
    const that = this;
    that.setData({ loading: true });
    
    // 创建支付订单
    api.createMinipPayment({
      orderId,
      accountId,
      rentalHours: parseInt(rentalHours)
    })
    .then(res => {
      const { timeStamp, nonceStr, package: pkg, signType, paySign } = res.data;
      
      // 调用微信支付
      wx.requestPayment({
        timeStamp,
        nonceStr,
        package: pkg,
        signType,
        paySign,
        success(res) {
          console.log('支付成功:', res);
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/order/detail/index?id=${orderId}`
            });
          }, 1500);
        },
        fail(err) {
          console.error('支付失败:', err);
          that.setData({ loading: false });
          
          if (err.errMsg === 'requestPayment:fail cancel') {
            wx.showToast({
              title: '取消支付',
              icon: 'none'
            });
          } else {
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
      that.setData({ loading: false });
      
      wx.showToast({
        title: error.error || '创建支付订单失败',
        icon: 'none'
      });
    });
  },

  /**
   * 取消支付
   */
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消支付吗？',
      success(res) {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
});
