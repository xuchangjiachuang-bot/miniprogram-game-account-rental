// pages/auth/bind-phone/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    loading: false
  },

  onLoad(options) {
    console.log('绑定手机号页面加载', options);
  },

  /**
   * 获取手机号
   */
  onGetPhoneNumber(e) {
    console.log('获取手机号', e);
    
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '取消授权',
        icon: 'none'
      });
      return;
    }
    
    const { code, encryptedData, iv } = e.detail;
    const that = this;
    that.setData({ loading: true });
    
    // 调用后端接口绑定手机号
    api.bindPhone({
      code,
      encryptedData,
      iv
    })
    .then(res => {
      console.log('绑定手机号成功:', res);
      
      // 更新用户信息
      storage.getUserInfo().then(userInfo => {
        if (userInfo) {
          userInfo.phone = res.phone;
          storage.setUserInfo(userInfo);
        }
      });
      
      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    })
    .catch(error => {
      console.error('绑定手机号失败:', error);
      that.setData({ loading: false });
      
      wx.showToast({
        title: error.error || '绑定失败',
        icon: 'none'
      });
    });
  },

  /**
   * 跳过
   */
  onSkip() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
