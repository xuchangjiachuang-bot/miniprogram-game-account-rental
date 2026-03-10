// pages/account/publish/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');

Page({
  data: {
    form: {
      images: [],
      accountId: '',
      password: '',
      verifyCode: '',
      loginMethodIndex: 0,
      coinsM: '',
      safeboxIndex: 0,
      staminaLevel: 6,
      energyLevel: 7,
      rankIndex: 0,
      kd: '',
      hasSkins: false,
      skinTierIndex: 0,
      skinCount: '',
      hasBattlepass: false,
      battlepassLevel: '',
      description: '',
      rentalPrice: '',
      deposit: '',
      rentalType: 'hour',
      rentalDuration: '',
      totalPrice: 0
    },
    loginMethodOptions: [
      { label: '微信扫码登录', value: 'wechat' },
      { label: 'QQ账号密码登录', value: 'qq' },
      { label: 'Steam账号密码登录', value: 'password' }
    ],
    safeboxOptions: [
      { label: '2×2（4格）', value: 4 },
      { label: '2×3（6格）', value: 6 },
      { label: '3×3（9格）', value: 9 }
    ],
    levelOptions: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    rankOptions: [
      { label: '无', value: 'none' },
      { label: '青铜', value: 'bronze' },
      { label: '白银', value: 'silver' },
      { label: '黄金', value: 'gold' },
      { label: '铂金', value: 'platinum' },
      { label: '钻石', value: 'diamond' },
      { label: '黑鹰', value: 'blackeagle' },
      { label: '巅峰', value: 'peak' }
    ],
    skinTierOptions: ['普通', '稀有', '史诗', '传说', '至尊'],
    submitting: false
  },

  onLoad(options) {
    console.log('账号发布页面加载');
    this.updateTotalPrice();
  },

  /**
   * 更新总价
   */
  updateTotalPrice() {
    const { rentalPrice, deposit } = this.data.form;
    const price = parseFloat(rentalPrice || 0);
    const dep = parseFloat(deposit || 0);
    this.setData({
      'form.totalPrice': (price + dep).toFixed(2)
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const { form } = this.data;
    const maxCount = 5;

    wx.chooseMedia({
      count: maxCount - form.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          'form.images': [...form.images, ...tempFiles]
        });
      }
    });
  },

  /**
   * 预览图片
   */
  onImagePreview(e) {
    const url = e.currentTarget.dataset.url;
    const { images } = this.data.form;
    wx.previewImage({
      urls: images,
      current: url
    });
  },

  /**
   * 删除图片
   */
  onImageDelete(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data.form;
    images.splice(index, 1);
    this.setData({
      'form.images': images
    });
  },

  /**
   * 游戏账号输入
   */
  onAccountIdInput(e) {
    this.setData({
      'form.accountId': e.detail.value
    });
  },

  /**
   * 密码输入
   */
  onPasswordInput(e) {
    this.setData({
      'form.password': e.detail.value
    });
  },

  /**
   * 验证码输入
   */
  onVerifyCodeInput(e) {
    this.setData({
      'form.verifyCode': e.detail.value
    });
  },

  /**
   * 登录方式选择
   */
  onLoginMethodChange(e) {
    this.setData({
      'form.loginMethodIndex': parseInt(e.detail.value)
    });
  },

  /**
   * 哈夫币输入
   */
  onCoinsMInput(e) {
    this.setData({
      'form.coinsM': e.detail.value
    });
  },

  /**
   * 安全箱选择
   */
  onSafeboxChange(e) {
    this.setData({
      'form.safeboxIndex': parseInt(e.detail.value)
    });
  },

  /**
   * 体力等级选择
   */
  onStaminaLevelChange(e) {
    this.setData({
      'form.staminaLevel': parseInt(e.detail.value)
    });
  },

  /**
   * 负重等级选择
   */
  onEnergyLevelChange(e) {
    this.setData({
      'form.energyLevel': parseInt(e.detail.value)
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
   * KD值输入
   */
  onKdInput(e) {
    this.setData({
      'form.kd': e.detail.value
    });
  },

  /**
   * 是否有皮肤切换
   */
  onHasSkinsChange(e) {
    this.setData({
      'form.hasSkins': e.detail.value
    });
  },

  /**
   * 皮肤等级选择
   */
  onSkinTierChange(e) {
    this.setData({
      'form.skinTierIndex': parseInt(e.detail.value)
    });
  },

  /**
   * 皮肤数量输入
   */
  onSkinCountInput(e) {
    this.setData({
      'form.skinCount': e.detail.value
    });
  },

  /**
   * 是否有战斗通行证切换
   */
  onHasBattlepassChange(e) {
    this.setData({
      'form.hasBattlepass': e.detail.value
    });
  },

  /**
   * 战斗通行证等级输入
   */
  onBattlepassLevelInput(e) {
    this.setData({
      'form.battlepassLevel': e.detail.value
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
   * 租金输入
   */
  onRentalPriceInput(e) {
    this.setData({
      'form.rentalPrice': e.detail.value
    }, () => {
      this.updateTotalPrice();
    });
  },

  /**
   * 押金输入
   */
  onDepositInput(e) {
    this.setData({
      'form.deposit': e.detail.value
    }, () => {
      this.updateTotalPrice();
    });
  },

  /**
   * 租期类型切换
   */
  onRentalTypeTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'form.rentalType': type,
      'form.rentalDuration': ''
    });
  },

  /**
   * 租赁时长输入
   */
  onRentalDurationInput(e) {
    this.setData({
      'form.rentalDuration': e.detail.value
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const form = this.data.form;

    if (form.images.length === 0) {
      wx.showToast({
        title: '请至少上传一张截图',
        icon: 'none'
      });
      return false;
    }

    if (!form.accountId) {
      wx.showToast({
        title: '请输入游戏账号',
        icon: 'none'
      });
      return false;
    }

    if (!form.password) {
      wx.showToast({
        title: '请输入游戏密码',
        icon: 'none'
      });
      return false;
    }

    if (!form.coinsM || parseFloat(form.coinsM) <= 0) {
      wx.showToast({
        title: '请输入哈夫币数量',
        icon: 'none'
      });
      return false;
    }

    if (!form.rentalPrice || parseFloat(form.rentalPrice) <= 0) {
      wx.showToast({
        title: '请输入租金金额',
        icon: 'none'
      });
      return false;
    }

    if (!form.deposit || parseFloat(form.deposit) < 0) {
      wx.showToast({
        title: '请输入押金金额',
        icon: 'none'
      });
      return false;
    }

    if (!form.rentalDuration || parseFloat(form.rentalDuration) <= 0) {
      wx.showToast({
        title: form.rentalType === 'hour' ? '请输入租赁小时数' : '请输入租赁天数',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  /**
   * 提交表单
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
    const userInfo = storage.getUserInfo();

    // 构建请求参数
    const params = {
      sellerId: userInfo?.id || '',
      accountId: form.accountId,
      title: '', // 后端会自动生成
      description: form.description,
      screenshots: form.images,
      coinsM: parseFloat(form.coinsM),
      safeboxCount: that.data.safeboxOptions[form.safeboxIndex].value,
      energyValue: parseInt(form.energyLevel),
      staminaValue: parseInt(form.staminaLevel),
      hasSkins: form.hasSkins,
      skinTier: form.hasSkins ? that.data.skinTierOptions[form.skinTierIndex] : null,
      skinCount: form.hasSkins ? parseInt(form.skinCount || 0) : 0,
      hasBattlepass: form.hasBattlepass,
      battlepassLevel: form.hasBattlepass ? parseInt(form.battlepassLevel || 0) : 0,
      customAttributes: {
        loginMethod: that.data.loginMethodOptions[form.loginMethodIndex].value,
        rank: that.data.rankOptions[form.rankIndex].value,
        kd: form.kd ? parseFloat(form.kd) : 0
      },
      tags: [],
      accountValue: parseFloat(form.rentalPrice),
      recommendedRental: parseFloat(form.rentalPrice),
      rentalRatio: 35, // 默认比例
      deposit: parseFloat(form.deposit),
      totalPrice: parseFloat(form.totalPrice),
      rentalDays: form.rentalType === 'day' ? parseFloat(form.rentalDuration) : null,
      rentalHours: form.rentalType === 'hour' ? parseFloat(form.rentalDuration) : null,
      rentalDescription: form.rentalType === 'hour'
        ? `${form.rentalDuration}小时`
        : `${form.rentalDuration}天`,
      username: form.accountId,
      password: form.password,
      verifyCode: form.verifyCode
    };

    that.setData({ submitting: true });

    api.createAccount(params)
      .then(res => {
        that.setData({ submitting: false });

        wx.showToast({
          title: '发布成功，等待审核',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(error => {
        console.error('发布失败:', error);
        that.setData({ submitting: false });

        // 使用Mock数据模拟发布成功
        if (config.useMockData) {
          wx.showToast({
            title: '发布成功（Mock）',
            icon: 'success'
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: error.error || '发布失败',
            icon: 'none'
          });
        }
      });
  }
});
