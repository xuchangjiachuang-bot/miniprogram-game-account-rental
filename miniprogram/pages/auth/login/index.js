const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const chat = require('../../../utils/chat.js');

Page({
  data: {
    agreed: false,
    loading: false,
    canGetUserProfile: false,
  },

  onLoad() {
    this.setData({ canGetUserProfile: typeof wx.getUserProfile === 'function' });

    const token = storage.getToken();
    if (token) {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  onAgreementChange(e) {
    const values = e.detail.value || [];
    this.setData({ agreed: values.includes('agreed') });
  },

  onWechatLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议与隐私政策', icon: 'none' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    const handleLogin = (profile = {}) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            wx.hideLoading();
            this.setData({ loading: false });
            wx.showToast({ title: '获取登录凭证失败', icon: 'none' });
            return;
          }

          api.miniprogramLogin({
            code: loginRes.code,
            nickname: profile.nickname,
            avatar: profile.avatarUrl,
          })
            .then((res) => {
              const token = res.token || res.data?.token;
              const user = res.user || res.data?.user;
              if (!token || !user) {
                throw new Error('登录返回数据不完整');
              }

              storage.setToken(token);
              storage.setUserInfo(user);

              try {
                chat.connect();
              } catch (error) {
                console.error('初始化聊天连接失败:', error);
              }

              wx.hideLoading();
              this.setData({ loading: false });
              wx.showToast({ title: '登录成功', icon: 'success' });

              setTimeout(() => {
                if (!user.phone) {
                  wx.redirectTo({ url: '/pages/auth/bind-phone/index' });
                  return;
                }
                wx.reLaunch({ url: '/pages/index/index' });
              }, 1000);
            })
            .catch((error) => {
              console.error('微信登录失败:', error);
              wx.hideLoading();
              this.setData({ loading: false });
              wx.showModal({
                title: '登录失败',
                content: error.error || error.message || '暂时无法完成登录，请稍后重试。',
                showCancel: false,
              });
            });
        },
        fail: (error) => {
          console.error('wx.login 失败:', error);
          wx.hideLoading();
          this.setData({ loading: false });
          wx.showToast({ title: '获取微信登录凭证失败', icon: 'none' });
        },
      });
    };

    if (this.data.canGetUserProfile) {
      wx.getUserProfile({
        desc: '用于完善账号信息与头像',
        success: (res) => handleLogin(res.userInfo || {}),
        fail: () => handleLogin(),
      });
      return;
    }

    handleLogin();
  },

  onAgreementTap() {
    wx.showModal({
      title: '用户协议',
      content: '当前版本会在后续补充完整协议内容，登录即表示同意平台规则与担保交易说明。',
      showCancel: false,
    });
  },

  onPrivacyTap() {
    wx.showModal({
      title: '隐私政策',
      content: '我们仅在登录、绑手机和订单服务中使用必要信息，不会在未经授权的情况下对外共享。',
      showCancel: false,
    });
  },
});
