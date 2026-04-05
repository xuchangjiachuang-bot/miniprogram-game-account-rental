const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const navigation = require('../../../utils/navigation.js');

const RENTAL_SPEED_OPTIONS = [10, 20, 30, 40, 50];

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function calculateSuggestedRental(coinsM, rentalRatio) {
  const coins = Number(coinsM || 0);
  const ratio = Number(rentalRatio || 0);
  if (!coins || !ratio) return 0;
  return (coins * 100) / ratio;
}

function calculateRentalPeriod(coinsM, rentalSpeed) {
  const coins = Number(coinsM || 0);
  const speed = Number(rentalSpeed || 10) || 10;
  const days = Math.max(1, Math.ceil(coins / speed || 1));
  return {
    days,
    hours: days * 24,
    text: speed + 'M/天，预计 ' + days + ' 天完成',
  };
}

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
      rentalRatio: '35',
      rentalSpeed: 10,
      deposit: '',
      suggestedRental: '0.00',
      totalPrice: '0.00',
      rentalPeriodText: '10M/天，预计 1 天完成',
    },
    loginMethodOptions: [
      { label: '微信扫码登录', value: 'wechat' },
      { label: 'QQ 账号密码登录', value: 'qq' },
      { label: 'Steam 账号密码登录', value: 'password' },
    ],
    safeboxOptions: [
      { label: '2x2（4 格）', value: 4 },
      { label: '2x3（6 格）', value: 6 },
      { label: '3x3（9 格）', value: 9 },
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
      { label: '巅峰', value: 'peak' },
    ],
    skinTierOptions: ['普通', '稀有', '史诗', '传说', '至尊'],
    rentalSpeedOptions: RENTAL_SPEED_OPTIONS,
    submitting: false,
  },

  onLoad() {
    this.updatePricing();
  },

  updatePricing() {
    const form = this.data.form;
    const suggestedRental = calculateSuggestedRental(form.coinsM, form.rentalRatio);
    const deposit = Number(form.deposit || 0);
    const period = calculateRentalPeriod(form.coinsM, form.rentalSpeed);

    this.setData({
      'form.suggestedRental': formatMoney(suggestedRental),
      'form.totalPrice': formatMoney(suggestedRental + deposit),
      'form.rentalPeriodText': period.text,
    });
  },

  onChooseImage() {
    const form = this.data.form;
    const maxCount = 5;
    wx.chooseMedia({
      count: maxCount - form.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => file.tempFilePath);
        this.setData({
          'form.images': form.images.concat(tempFiles),
        });
      },
    });
  },

  onImagePreview(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: this.data.form.images,
      current: url,
    });
  },

  onImageDelete(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const images = this.data.form.images.slice();
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  onAccountIdInput(e) { this.setData({ 'form.accountId': e.detail.value }); },
  onPasswordInput(e) { this.setData({ 'form.password': e.detail.value }); },
  onVerifyCodeInput(e) { this.setData({ 'form.verifyCode': e.detail.value }); },
  onLoginMethodChange(e) { this.setData({ 'form.loginMethodIndex': Number(e.detail.value || 0) }); },
  onSafeboxChange(e) { this.setData({ 'form.safeboxIndex': Number(e.detail.value || 0) }); },
  onStaminaLevelChange(e) { this.setData({ 'form.staminaLevel': Number(e.detail.value || 0) }); },
  onEnergyLevelChange(e) { this.setData({ 'form.energyLevel': Number(e.detail.value || 0) }); },
  onRankChange(e) { this.setData({ 'form.rankIndex': Number(e.detail.value || 0) }); },
  onKdInput(e) { this.setData({ 'form.kd': e.detail.value }); },
  onHasSkinsChange(e) { this.setData({ 'form.hasSkins': e.detail.value }); },
  onSkinTierChange(e) { this.setData({ 'form.skinTierIndex': Number(e.detail.value || 0) }); },
  onSkinCountInput(e) { this.setData({ 'form.skinCount': e.detail.value }); },
  onHasBattlepassChange(e) { this.setData({ 'form.hasBattlepass': e.detail.value }); },
  onBattlepassLevelInput(e) { this.setData({ 'form.battlepassLevel': e.detail.value }); },
  onDescriptionInput(e) { this.setData({ 'form.description': e.detail.value }); },

  onCoinsMInput(e) {
    this.setData({ 'form.coinsM': e.detail.value }, () => this.updatePricing());
  },

  onRentalRatioInput(e) {
    this.setData({ 'form.rentalRatio': e.detail.value }, () => this.updatePricing());
  },

  onRentalSpeedTap(e) {
    this.setData({ 'form.rentalSpeed': Number(e.currentTarget.dataset.speed || 10) }, () => this.updatePricing());
  },

  onDepositInput(e) {
    this.setData({ 'form.deposit': e.detail.value }, () => this.updatePricing());
  },

  validateForm() {
    const form = this.data.form;
    if (form.images.length === 0) {
      wx.showToast({ title: '请至少上传一张账号截图', icon: 'none' });
      return false;
    }
    if (!form.accountId) {
      wx.showToast({ title: '请输入游戏账号', icon: 'none' });
      return false;
    }
    if (!form.password) {
      wx.showToast({ title: '请输入游戏密码', icon: 'none' });
      return false;
    }
    if (!form.coinsM || Number(form.coinsM) <= 0) {
      wx.showToast({ title: '请输入哈夫币数量', icon: 'none' });
      return false;
    }
    if (!form.rentalRatio || Number(form.rentalRatio) < 30 || Number(form.rentalRatio) > 50) {
      wx.showToast({ title: '出租比例需在 30 到 50 之间', icon: 'none' });
      return false;
    }
    if (!form.deposit || Number(form.deposit) < 0) {
      wx.showToast({ title: '请输入押金金额', icon: 'none' });
      return false;
    }
    return true;
  },

  onSubmit() {
    if (!this.validateForm() || this.data.submitting) return;

    wx.showModal({
      title: '确认上架',
      content: '确认提交该账号吗？提交后会进入审核流程。',
      success: (res) => {
        if (res.confirm) {
          this.publishAccount();
        }
      },
    });
  },

  publishAccount() {
    const form = this.data.form;
    const userInfo = storage.getUserInfo() || {};
    const period = calculateRentalPeriod(form.coinsM, form.rentalSpeed);
    const recommendedRental = Number(form.suggestedRental || 0);

    const params = {
      sellerId: userInfo.id || '',
      accountId: form.accountId,
      title: '',
      description: form.description,
      screenshots: form.images,
      coinsM: Number(form.coinsM || 0),
      safeboxCount: this.data.safeboxOptions[form.safeboxIndex].value,
      energyValue: Number(form.energyLevel),
      staminaValue: Number(form.staminaLevel),
      hasSkins: form.hasSkins,
      skinTier: form.hasSkins ? this.data.skinTierOptions[form.skinTierIndex] : null,
      skinCount: form.hasSkins ? Number(form.skinCount || 0) : 0,
      hasBattlepass: form.hasBattlepass,
      battlepassLevel: form.hasBattlepass ? Number(form.battlepassLevel || 0) : 0,
      customAttributes: {
        loginMethod: this.data.loginMethodOptions[form.loginMethodIndex].value,
        rank: this.data.rankOptions[form.rankIndex].value,
        kd: form.kd ? Number(form.kd) : 0,
        rentalSpeed: form.rentalSpeed,
      },
      tags: [],
      accountValue: recommendedRental,
      recommendedRental,
      rentalRatio: Number(form.rentalRatio || 0),
      deposit: Number(form.deposit || 0),
      totalPrice: Number(form.totalPrice || 0),
      rentalDays: period.days,
      rentalHours: period.hours,
      rentalDescription: form.rentalPeriodText,
      username: form.accountId,
      password: form.password,
      verifyCode: form.verifyCode,
    };

    this.setData({ submitting: true });

    api.createAccount(params)
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '发布成功，等待审核', icon: 'success' });
        setTimeout(() => navigation.safeNavigateBack({
            fallbackUrl: '/pages/profile/index',
            fallbackType: 'switchTab',
          }), 1200);
      })
      .catch((error) => {
        console.error('发布失败:', error);
        this.setData({ submitting: false });
        if (config.useMockData) {
          wx.showToast({ title: '发布成功（Mock）', icon: 'success' });
          setTimeout(() => navigation.safeNavigateBack({
            fallbackUrl: '/pages/profile/index',
            fallbackType: 'switchTab',
          }), 1200);
          return;
        }
        wx.showToast({
          title: error && error.error ? error.error : '发布失败，请稍后再试',
          icon: 'none',
        });
      });
  },
});
