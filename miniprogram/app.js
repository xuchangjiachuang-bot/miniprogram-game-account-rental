const storage = require('./utils/storage.js');
const api = require('./utils/api.js');
const config = require('./utils/config.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: config.baseUrl,
    wsUrl: config.wsUrl,
    systemInfo: null,
    loginModalVisible: false,
  },

  onLaunch() {
    console.log('小程序启动');
    this.getSystemInfo();
    this.checkLogin();
  },

  checkLogin() {
    const token = storage.getToken();
    const userInfo = storage.getUserInfo();

    if (!token) {
      this.globalData.token = null;
      this.globalData.userInfo = null;
      this.showLoginModal();
      return Promise.resolve(null);
    }

    this.globalData.token = token;
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }

    return this.verifyToken();
  },

  verifyToken() {
    return api.getUserInfo()
      .then((res) => {
        const userInfo = res?.data || null;
        this.globalData.userInfo = userInfo;
        if (userInfo) {
          storage.setUserInfo(userInfo);
        }
        this.hideLoginModal();
        return userInfo;
      })
      .catch((error) => {
        console.error('校验登录状态失败:', error);
        storage.removeToken();
        storage.removeUserInfo();
        this.globalData.token = null;
        this.globalData.userInfo = null;
        this.showLoginModal();
        return null;
      });
  },

  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      },
    });
  },

  showLoginModal() {
    this.globalData.loginModalVisible = true;
  },

  hideLoginModal() {
    this.globalData.loginModalVisible = false;
  },

  onLoginSuccess(detail) {
    const payload = detail?.detail || detail || {};
    this.globalData.userInfo = payload.user || null;
    this.globalData.token = payload.token || storage.getToken() || null;

    if (payload.user) {
      storage.setUserInfo(payload.user);
    }
    if (payload.token) {
      storage.setToken(payload.token);
    }

    this.hideLoginModal();
  },
});
