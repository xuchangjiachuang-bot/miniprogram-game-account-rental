// pages/account/publish/index.js
const api = require('../../../utils/api.js');

Page({
  data: {
    form: {
      images: [],
      title: '',
      description: '',
      gameAccount: '',
      gamePassword: '',
      gameVerify: '',
      rankIndex: 0,
      power: '',
      skinWeapon: '',
      skinCharacter: '',
      otherSkins: '',
      duration: 1,
      depositRequired: false,
      depositAmount: ''
    },
    rankOptions: [
      { label: '青铜', value: 'bronze' },
      { label: '白银', value: 'silver' },
      { label: '黄金', value: 'gold' },
      { label: '铂金', value: 'platinum' },
      { label: '钻石', value: 'diamond' },
      { label: '星钻', value: 'star' },
      { label: '皇冠', value: 'crown' },
      { label: '超级皇冠', value: 'super' }
    ],
    durationOptions: [
      { label: '1小时', value: 1, price: 2 },
      { label: '2小时', value: 2, price: 3 },
      { label: '4小时', value: 4, price: 5 },
      { label: '8小时', value: 8, price: 8 },
      { label: '12小时', value: 12, price: 10 },
      { label: '24小时', value: 24, price: 15 }
    ],
    submitting: false
  },

  onLoad(options) {
    console.log('账号发布页面加载');
  },

  /**
   * 图片变更
   */
  onImagesChange(e) {
    this.setData({
      'form.images': e.detail.images
    });
  },

  /**
   * 标题输入
   */
  onTitleInput(e) {
    this.setData({
      'form.title': e.detail.value
    });
  },

  /**
   * 描述输入
   */
  onDescriptionInput(e) {
    this.setData({
      'form.description': e.detail.value
    });
  },

  /**
   * 游戏账号输入
   */
  onGameAccountInput(e) {
    this.setData({
      'form.gameAccount': e.detail.value
    });
  },

  /**
   * 游戏密码输入
   */
  onGamePasswordInput(e) {
    this.setData({
      'form.gamePassword': e.detail.value
    });
  },

  /**
   * 验证码输入
   */
  onGameVerifyInput(e) {
    this.setData({
      'form.gameVerify': e.detail.value
    });
  },

  /**
   * 段位选择
   */
  onRankChange(e) {
    this.setData({
      'form.rankIndex': parseInt(e.detail.value)
    });
  },

  /**
   * 战力输入
   */
  onPowerInput(e) {
    this.setData({
      'form.power': e.detail.value
    });
  },

  /**
   * 主武器皮肤输入
   */
  onSkinWeaponInput(e) {
    this.setData({
      'form.skinWeapon': e.detail.value
    });
  },

  /**
   * 角色皮肤输入
   */
  onSkinCharacterInput(e) {
    this.setData({
      'form.skinCharacter': e.detail.value
    });
  },

  /**
   * 其他皮肤输入
   */
  onOtherSkinsInput(e) {
    this.setData({
      'form.otherSkins': e.detail.value
    });
  },

  /**
   * 时长选择
   */
  onDurationTap(e) {
    const duration = e.currentTarget.dataset.value;
    
    this.setData({
      'form.duration': duration
    });
  },

  /**
   * 押金开关
   */
  onDepositChange(e) {
    this.setData({
      'form.depositRequired': e.detail.value
    });
  },

  /**
   * 押金金额输入
   */
  onDepositAmountInput(e) {
    this.setData({
      'form.depositAmount': e.detail.value
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const form = this.data.form;
    
    if (form.images.length === 0) {
      wx.showToast({
        title: '请至少上传一张封面图片',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.title || form.title.length < 10) {
      wx.showToast({
        title: '账号标题至少10个字',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.gameAccount) {
      wx.showToast({
        title: '请输入游戏账号',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.gamePassword) {
      wx.showToast({
        title: '请输入游戏密码',
        icon: 'none'
      });
      return false;
    }
    
    if (!form.skinWeapon) {
      wx.showToast({
        title: '请输入主武器皮肤',
        icon: 'none'
      });
      return false;
    }
    
    if (form.depositRequired && !form.depositAmount) {
      wx.showToast({
        title: '请输入押金金额',
        icon: 'none'
      });
      return false;
    }
    
    return true;
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
      title: '确认发布',
      content: '确认发布此账号吗？发布后将进入审核流程。',
      success(res) {
        if (res.confirm) {
          that.publishAccount();
        }
      }
    });
  },

  /**
   * 发布账号
   */
  publishAccount() {
    const that = this;
    const form = that.data.form;
    const rank = that.data.rankOptions[form.rankIndex].value;
    const duration = that.data.durationOptions.find(d => d.value === form.duration);
    
    that.setData({ submitting: true });
    
    api.publishAccount({
      images: form.images,
      title: form.title,
      description: form.description,
      gameAccount: form.gameAccount,
      gamePassword: form.gamePassword,
      gameVerify: form.gameVerify || '',
      rank,
      power: form.power ? parseInt(form.power) : null,
      skinWeapon: form.skinWeapon,
      skinCharacter: form.skinCharacter || '',
      otherSkins: form.otherSkins || '',
      duration: form.duration,
      price: duration.price,
      depositRequired: form.depositRequired,
      depositAmount: form.depositRequired ? parseFloat(form.depositAmount) : null
    })
    .then(res => {
      that.setData({ submitting: false });
      
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    })
    .catch(error => {
      console.error('发布失败:', error);
      that.setData({ submitting: false });
      
      wx.showToast({
        title: error.error || '发布失败',
        icon: 'none'
      });
    });
  }
});
