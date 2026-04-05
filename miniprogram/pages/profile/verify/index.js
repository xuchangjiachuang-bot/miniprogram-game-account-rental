const api = require('../../../utils/api.js');

Page({
  data: {
    userInfo: {},
    verifyStatus: 'none',
    statusKey: 'none',
    statusIcon: '未',
    statusText: '未认证',
    statusDesc: '请填写真实姓名、身份证号和手机号完成认证。',
    canSubmit: true,
    form: {
      realName: '',
      idCard: '',
      phone: '',
    },
    submitting: false,
    history: [],
    maskedIdCard: '',
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadHistory();
  },

  loadUserInfo() {
    api.getUserInfo()
      .then((res) => {
        const userInfo = res?.data || {};
        const status = this.resolveStatus(
          userInfo.verifyStatus || (userInfo.isVerified ? 'approved' : 'none'),
          userInfo.verifyRejectReason,
        );

        this.setData({
          userInfo,
          verifyStatus: status.verifyStatus,
          statusKey: status.statusKey,
          statusIcon: status.statusIcon,
          statusText: status.statusText,
          statusDesc: status.statusDesc,
          canSubmit: status.canSubmit,
          maskedIdCard: this.maskIdCard(userInfo.idCard),
          form: {
            realName: userInfo.realName || this.data.form.realName,
            idCard: userInfo.idCard || this.data.form.idCard,
            phone: userInfo.phone || this.data.form.phone,
          },
        });
      })
      .catch((error) => {
        console.error('加载实名认证信息失败:', error);
      });
  },

  resolveStatus(verifyStatus, rejectReason) {
    switch (verifyStatus) {
      case 'pending':
        return {
          verifyStatus,
          statusKey: 'pending',
          statusIcon: '审',
          statusText: '审核中',
          statusDesc: '实名认证信息已提交，正在审核中，请耐心等待。',
          canSubmit: false,
        };
      case 'approved':
        return {
          verifyStatus,
          statusKey: 'approved',
          statusIcon: '已',
          statusText: '已认证',
          statusDesc: '当前账号已完成实名认证，可以正常发布和交易。',
          canSubmit: false,
        };
      case 'rejected':
        return {
          verifyStatus,
          statusKey: 'rejected',
          statusIcon: '退',
          statusText: '认证未通过',
          statusDesc: rejectReason || '请核对姓名、身份证号和手机号后重新提交。',
          canSubmit: true,
        };
      default:
        return {
          verifyStatus: 'none',
          statusKey: 'none',
          statusIcon: '未',
          statusText: '未认证',
          statusDesc: '请填写真实姓名、身份证号和手机号完成认证。',
          canSubmit: true,
        };
    }
  },

  maskIdCard(idCard) {
    if (!idCard || idCard.length < 8) return '';
    return `${idCard.slice(0, 4)}********${idCard.slice(-4)}`;
  },

  onNameInput(e) {
    this.setData({ 'form.realName': e.detail.value });
  },

  onIdCardInput(e) {
    this.setData({ 'form.idCard': e.detail.value.trim() });
  },

  onPhoneInput(e) {
    this.setData({ 'form.phone': e.detail.value.trim() });
  },

  validateForm() {
    const { realName, idCard, phone } = this.data.form;

    if (!realName.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return false;
    }

    if (!this.validateIdCard(idCard)) {
      wx.showToast({ title: '请输入正确的身份证号', icon: 'none' });
      return false;
    }

    if (!this.validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    return true;
  },

  validateIdCard(idCard) {
    return /(^\d{15}$)|(^\d{17}(\d|X|x)$)/.test(idCard || '');
  },

  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone || '');
  },

  onSubmit() {
    if (!this.validateForm() || this.data.submitting) {
      return;
    }

    wx.showModal({
      title: '确认提交',
      content: '提交后将进入审核流程，请确认姓名、身份证号和手机号填写无误。',
      success: (res) => {
        if (res.confirm) {
          this.submitVerify();
        }
      },
    });
  },

  submitVerify() {
    const form = this.data.form;
    this.setData({ submitting: true });

    api.submitRealNameVerify({
      realName: form.realName.trim(),
      idCard: form.idCard.trim(),
      phone: form.phone.trim(),
    })
      .then(() => {
        wx.showToast({
          title: '提交成功',
          icon: 'success',
        });

        setTimeout(() => {
          this.loadUserInfo();
          this.loadHistory();
        }, 1200);
      })
      .catch((error) => {
        console.error('提交实名认证失败:', error);
        wx.showToast({
          title: error.error || '提交失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  loadHistory() {
    api.getVerifyHistory()
      .then((res) => {
        const list = res?.data?.list || res?.data || [];
        this.setData({
          history: Array.isArray(list) ? list : [],
        });
      })
      .catch((error) => {
        console.error('加载认证记录失败:', error);
      });
  },

  onHistoryItemTap(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/profile/verify-detail/index?id=${id}`,
    });
  },
});
