// app.js
const storage = require('./utils/storage.js');
const api = require('./utils/api.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://your-domain.com/api',
    wsUrl: 'wss://your-domain.com',
    loginModalVisible: false
  },

  onLaunch() {
    // 小程序启动时执行
    console.log('小程序启动');

    // 检查登录状态（仅首次启动时检查）
    this.checkLogin();

    // 获取系统信息
    this.getSystemInfo();
  },

  onShow() {
    // 小程序显示时执行
    // 不再每次显示都检查登录状态，避免重复弹窗
    // this.checkLogin();
  },

  onHide() {
    // 小程序隐藏时执行
  },

  // 检查登录状态
  checkLogin() {
    const token = storage.getToken();
    if (token) {
      this.globalData.token = token;
      // 验证token是否有效
      this.verifyToken();
    } else {
      // 未登录，显示登录弹窗
      this.showLoginModal();
    }
  },

  // 验证token是否有效
  verifyToken() {
    api.getUserInfo()
      .then(res => {
        this.globalData.userInfo = res.data;
        // 隐藏登录弹窗
        this.hideLoginModal();
      })
      .catch(err => {
        console.error('Token验证失败:', err);
        // 清除无效token
        storage.clearToken();
        storage.clearUserInfo();
        this.globalData.token = null;
        this.globalData.userInfo = null;
        // 显示登录弹窗
        this.showLoginModal();
      });
  },

  // 获取用户信息
  getUserInfo() {
    const that = this;
    wx.request({
      url: `${this.globalData.baseUrl}/auth/me`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${this.globalData.token}`
      },
      success(res) {
        if (res.data.success) {
          that.globalData.userInfo = res.data.data;
        }
      }
    });
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },

  // 显示登录弹窗
  showLoginModal() {
    this.globalData.loginModalVisible = true;
  },

  // 隐藏登录弹窗
  hideLoginModal() {
    this.globalData.loginModalVisible = false;
  },

  // 登录成功回调
  onLoginSuccess(e) {
    console.log('登录成功:', e.detail);
    this.globalData.userInfo = e.detail.user;
    this.globalData.token = e.detail.token;
    this.hideLoginModal();
  }
});

