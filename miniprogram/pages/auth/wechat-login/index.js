// pages/auth/wechat-login/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    loading: false
  },

  onLoad(options) {
    console.log('微信登录页面加载', options);
    
    // 检查是否有回调参数
    if (options.code) {
      this.handleWechatCode(options.code);
    }
  },

  /**
   * 微信授权登录
   */
  onGetUserInfo(e) {
    const that = this;
    
    console.log('获取用户信息:', e.detail);
    
    if (e.detail.errMsg !== 'getUserInfo:ok') {
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      });
      return;
    }
    
    that.setData({ loading: true });
    
    // 1. 先获取微信登录code
    wx.login({
      success(res) {
        console.log('微信登录code:', res.code);
        
        if (res.code) {
          // 2. 发送到服务器
          api.wechatLogin({
            code: res.code,
            userInfo: e.detail.userInfo,
            encryptedData: e.detail.encryptedData,
            iv: e.detail.iv
          })
          .then(loginRes => {
            console.log('[微信登录页面] 登录成功:', loginRes);
            
            const { token, user } = loginRes.data;
            
            if (!token || !user) {
              throw new Error('登录返回数据格式错误');
            }
            
            // 保存token和用户信息
            storage.setToken(token);
            storage.setUserInfo(user);
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });
            
            // 延迟跳转
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }, 1500);
          })
          .catch(error => {
            console.error('微信登录失败:', error);
            that.setData({ loading: false });
            
            wx.showToast({
              title: error.error || '登录失败',
              icon: 'none'
            });
          });
        } else {
          that.setData({ loading: false });
          wx.showToast({
            title: '获取登录信息失败',
            icon: 'none'
          });
        }
      },
      fail(err) {
        console.error('wx.login失败:', err);
        that.setData({ loading: false });
        
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 处理微信回调code
   */
  handleWechatCode(code) {
    const that = this;
    
    api.wechatLogin({ code })
      .then(res => {
        const { token, userInfo } = res.data;
        
        storage.setToken(token);
        storage.setUserInfo(userInfo);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      })
      .catch(error => {
        console.error('处理微信code失败:', error);
        wx.showToast({
          title: error.error || '登录失败',
          icon: 'none'
        });
      });
  },

  /**
   * 返回首页
   */
  onBack() {
    wx.navigateBack();
  }
});
