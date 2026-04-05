const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    phone: '',
    loading: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(String(phone || '').trim());
  },

  onSubmit() {
    const phone = String(this.data.phone || '').trim();
    if (!this.validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (this.data.loading) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '绑定中...', mask: true });

    const request = api.bindPhone({ phone }).catch(() => api.manualBindPhone({ phone }));
    request
      .then((res) => {
        const userInfo = storage.getUserInfo() || {};
        userInfo.phone = res.phone || res.data?.user?.phone || phone;
        storage.setUserInfo(userInfo);
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: '绑定成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1000);
      })
      .catch((error) => {
        console.error('绑定手机号失败:', error);
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: error.error || '绑定失败，请稍后重试', icon: 'none' });
      });
  },

  onSkip() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
