// pages/profile/verify/index.js
const api = require('../../../utils/api.js');

Page({
  data: {
    userInfo: {},
    verifyStatus: 'none', // none, pending, approved, rejected
    statusKey: '',
    statusIcon: '',
    statusText: '',
    statusDesc: '',
    canSubmit: true,
    form: {
      realName: '',
      idCard: '',
      idCardFront: '',
      idCardBack: '',
      phone: ''
    },
    submitting: false,
    history: []
  },

  onLoad(options) {
    console.log('实名认证页面加载');
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadHistory();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const that = this;
    
    api.getUserInfo()
      .then(res => {
        const userInfo = res.data;
        let statusKey = '';
        let statusIcon = '';
        let statusText = '';
        let statusDesc = '';
        let canSubmit = true;
        
        switch (userInfo.verifyStatus) {
          case 'none':
            statusKey = 'none';
            statusIcon = '📝';
            statusText = '未认证';
            statusDesc = '完成实名认证后，即可提现账号资金';
            canSubmit = true;
            break;
            
          case 'pending':
            statusKey = 'pending';
            statusIcon = '⏳';
            statusText = '审核中';
            statusDesc = '您的实名认证信息正在审核中，请耐心等待';
            canSubmit = false;
            break;
            
          case 'approved':
            statusKey = 'approved';
            statusIcon = '✅';
            statusText = '已认证';
            statusDesc = '您已完成实名认证';
            canSubmit = false;
            break;
            
          case 'rejected':
            statusKey = 'rejected';
            statusIcon = '❌';
            statusText = '认证失败';
            statusDesc = userInfo.verifyRejectReason || '认证未通过，请重新提交';
            canSubmit = true;
            break;
        }
        
        that.setData({
          userInfo,
          verifyStatus: userInfo.verifyStatus,
          statusKey,
          statusIcon,
          statusText,
          statusDesc,
          canSubmit,
          maskedIdCard: that.maskIdCard(userInfo.idCard)
        });
      });
  },

  /**
   * 脱敏身份证号
   */
  maskIdCard(idCard) {
    if (!idCard || idCard.length < 18) return '';
    return idCard.substring(0, 6) + '********' + idCard.substring(14);
  },

  /**
   * 姓名输入
   */
  onNameInput(e) {
    this.setData({
      'form.realName': e.detail.value
    });
  },

  /**
   * 身份证号输入
   */
  onIdCardInput(e) {
    this.setData({
      'form.idCard': e.detail.value
    });
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  /**
   * 上传身份证正面
   */
  onIdCardFrontTap() {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        that.uploadImage(res.tempFilePaths[0], 'front');
      }
    });
  },

  /**
   * 上传身份证背面
   */
  onIdCardBackTap() {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        that.uploadImage(res.tempFilePaths[0], 'back');
      }
    });
  },

  /**
   * 上传图片
   */
  uploadImage(filePath, type) {
    const that = this;
    
    wx.showLoading({
      title: '上传中...'
    });
    
    api.uploadImage(filePath)
      .then(res => {
        wx.hideLoading();
        
        const imageUrl = res.data.url;
        
        if (type === 'front') {
          that.setData({
            'form.idCardFront': imageUrl
          });
        } else {
          that.setData({
            'form.idCardBack': imageUrl
          });
        }
      })
      .catch(error => {
        wx.hideLoading();
        
        wx.showToast({
          title: error.error || '上传失败',
          icon: 'none'
        });
      });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const form = this.data.form;
    
    if (!form.realName) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      });
      return false;
    }
    
    if (!this.validateIdCard(form.idCard)) {
      wx.showToast({
        title: '身份证号格式不正确',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.idCardFront) {
      wx.showToast({
        title: '请上传身份证正面照片',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.idCardBack) {
      wx.showToast({
        title: '请上传身份证背面照片',
        icon: 'none'
      });
      return false;
    }
    
    if (form.phone && !this.validatePhone(form.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 验证身份证号
   */
  validateIdCard(idCard) {
    const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    return reg.test(idCard);
  },

  /**
   * 验证手机号
   */
  validatePhone(phone) {
    const reg = /^1[3-9]\d{9}$/;
    return reg.test(phone);
  },

  /**
   * 表单提交
   */
  onSubmit(e) {
    const that = this;
    
    if (!that.validateForm()) {
      return;
    }
    
    if (that.data.submitting) {
      return;
    }
    
    wx.showModal({
      title: '确认提交',
      content: '提交后信息将无法修改，请确认信息无误',
      success(res) {
        if (res.confirm) {
          that.submitVerify();
        }
      }
    });
  },

  /**
   * 提交认证
   */
  submitVerify() {
    const that = this;
    const form = that.data.form;
    
    that.setData({ submitting: true });
    
    api.submitRealNameVerify({
      realName: form.realName,
      idCard: form.idCard,
      idCardFront: form.idCardFront,
      idCardBack: form.idCardBack,
      phone: form.phone || null
    })
    .then(res => {
      that.setData({ submitting: false });
      
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        that.loadUserInfo();
      }, 1500);
    })
    .catch(error => {
      console.error('提交失败:', error);
      that.setData({ submitting: false });
      
      wx.showToast({
        title: error.error || '提交失败',
        icon: 'none'
      });
    });
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    const that = this;
    
    api.getVerifyHistory()
      .then(res => {
        that.setData({
          history: res.data.list || []
        });
      })
      .catch(error => {
        console.error('加载历史记录失败:', error);
      });
  },

  /**
   * 查看历史记录详情
   */
  onHistoryItemTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/profile/verify-detail/index?id=${id}`
    });
  }
});
