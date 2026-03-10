// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://your-domain.com/api',
    wsUrl: 'wss://your-domain.com'
  },

  onLaunch() {
    // 小程序启动时执行
    console.log('小程序启动');

    // 检查登录状态
    this.checkLogin();

    // 获取系统信息
    this.getSystemInfo();
  },

  onShow() {
    // 小程序显示时执行
  },

  onHide() {
    // 小程序隐藏时执行
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      // 获取用户信息
      this.getUserInfo();
    }
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
  }
});
