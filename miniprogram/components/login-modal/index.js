const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const app = getApp();

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    userInfo: null,
  },

  methods: {
    onMaskTap() {
      // 保持弹层开启，避免用户误触关闭后无法继续当前流程。
    },

    closeModal() {
      this.triggerEvent('close');
    },

    onGetUserProfile() {
      if (!wx.getUserProfile) {
        wx.showModal({
          title: '当前微信版本过低',
          content: '请升级微信后再尝试授权登录。',
          showCancel: false,
        });
        return;
      }

      wx.getUserProfile({
        desc: '用于完成账号登录与基础资料展示',
        success: (profileRes) => {
          if (!profileRes.userInfo) {
            wx.showToast({ title: '未获取到用户信息', icon: 'none' });
            return;
          }

          this.setData({ userInfo: profileRes.userInfo });
          this.doWechatLogin(profileRes.userInfo);
        },
        fail: (error) => {
          console.error('获取用户信息失败:', error);
          if ((error.errMsg || '').includes('cancel')) {
            wx.showToast({ title: '你已取消授权', icon: 'none' });
            return;
          }

          wx.showModal({
            title: '授权失败',
            content: error.errMsg || '获取用户信息失败，请稍后重试。',
            showCancel: false,
          });
        },
      });
    },

    doWechatLogin() {
      wx.showLoading({
        title: '登录中',
        mask: true,
      });

      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            wx.hideLoading();
            wx.showToast({ title: '未获取到登录凭证', icon: 'none' });
            return;
          }

          api.miniprogramLogin(loginRes.code)
            .then((res) => {
              wx.hideLoading();

              const token = res.token || res.data?.token;
              const user = res.user || res.data?.user;
              if (!token || !user) {
                throw new Error('登录返回数据格式不正确');
              }

              storage.setToken(token);
              storage.setUserInfo(user);

              app.globalData.userInfo = user;
              app.globalData.token = token;

              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 1500,
              });

              this.triggerEvent('loginSuccess', { user, token });
              this.closeModal();
            })
            .catch((error) => {
              wx.hideLoading();
              console.error('小程序登录失败:', error);
              wx.showModal({
                title: '登录失败',
                content: error.error || error.message || '请稍后重试。',
                showCancel: false,
              });
            });
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('wx.login 调用失败:', error);
          wx.showToast({ title: '微信登录失败', icon: 'none' });
        },
      });
    },
  },
});
