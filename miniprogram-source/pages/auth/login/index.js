// pages/auth/login/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const chat = require('../../../utils/chat.js');

Page({
  data: {
    phone: '',
    code: '',
    agreed: false,
    countdown: 0,
    canGetUserProfile: false
  },

  onLoad() {
    console.log('登录页面加载');
    
    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      this.setData({ canGetUserProfile: true });
    }
    
    // 检查是否已登录
    const token = storage.getToken();
    if (token) {
      // 已登录，跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 验证码输入
   */
  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
  },

  /**
   * 协议选择
   */
  onAgreementChange(e) {
    this.setData({
      agreed: e.detail.value.includes('agreed')
    });
  },

  /**
   * 获取验证码
   */
  onSendCode() {
    const { phone } = this.data;
    
    // 验证手机号
    if (!this.validatePhone(phone)) {
      return;
    }
    
    const that = this;
    
    // 调用发送验证码接口
    api.sendSmsCode({ phone })
      .then(res => {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        
        // 开始倒计时
        that.startCountdown();
      })
      .catch(error => {
        console.error('发送验证码失败:', error);
        wx.showToast({
          title: error.error || '发送失败',
          icon: 'none'
        });
      });
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    let countdown = 60;
    
    this.setData({ countdown });
    
    const timer = setInterval(() => {
      countdown--;
      
      if (countdown <= 0) {
        clearInterval(timer);
      }
      
      this.setData({ countdown });
    }, 1000);
  },

  /**
   * 微信登录
   */
  onWechatLogin() {
    const { agreed } = this.data;
    
    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    const that = this;
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 获取用户信息
    const getUserInfo = () => {
      if (that.data.canGetUserProfile) {
        return new Promise((resolve, reject) => {
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: res => {
              resolve(res.userInfo);
            },
            fail: reject
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          wx.getUserInfo({
            success: res => {
              resolve(res.userInfo);
            },
            fail: reject
          });
        });
      }
    };
    
    getUserInfo()
      .then(userInfo => {
        // 获取登录凭证
        return wx.login();
      })
      .then(loginRes => {
        // 调用登录接口
        return api.wechatLogin({
          code: loginRes.code
        });
      })
      .then(res => {
        const { token, user } = res.data;
        
        // 保存登录信息
        storage.setToken(token);
        storage.setUserInfo(user);
        
        // 初始化聊天连接
        chat.connect();
        
        wx.hideLoading();
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      })
      .catch(error => {
        console.error('微信登录失败:', error);
        wx.hideLoading();
        
        wx.showToast({
          title: error.error || '登录失败',
          icon: 'none'
        });
      });
  },

  /**
   * 手机号登录
   */
  onPhoneLogin() {
    const { phone, code, agreed } = this.data;
    
    // 验证协议
    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    // 验证手机号
    if (!this.validatePhone(phone)) {
      return;
    }
    
    // 验证验证码
    if (!code || code.length !== 6) {
      wx.showToast({
        title: '请输入正确的验证码',
        icon: 'none'
      });
      return;
    }
    
    const that = this;
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 调用登录接口
    api.phoneLogin({
      phone,
      code
    })
    .then(res => {
      const { token, user } = res.data;
      
      // 保存登录信息
      storage.setToken(token);
      storage.setUserInfo(user);
      
      // 初始化聊天连接
      chat.connect();
      
      wx.hideLoading();
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 跳转到首页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
    })
    .catch(error => {
      console.error('手机号登录失败:', error);
      wx.hideLoading();
      
      wx.showToast({
        title: error.error || '登录失败',
        icon: 'none'
      });
    });
  },

  /**
   * 用户协议
   */
  onAgreementTap() {
    wx.navigateTo({
      url: '/pages/webview/index?url=https://example.com/agreement'
    });
  },

  /**
   * 隐私政策
   */
  onPrivacyTap() {
    wx.navigateTo({
      url: '/pages/webview/index?url=https://example.com/privacy'
    });
  },

  /**
   * 验证手机号
   */
  validatePhone(phone) {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  /**
   * 是否可以登录
   */
  get canLogin() {
    const { phone, code, agreed } = this.data;
    return agreed && this.validatePhone(phone) && code && code.length === 6;
  }
});
