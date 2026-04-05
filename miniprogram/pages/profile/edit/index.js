const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

const genderOptions = [
  { label: '暂不填写', value: '' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '保密', value: 'secret' },
];

Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      phone: '',
    },
    form: {
      nickname: '',
      genderIndex: 0,
      bio: '',
    },
    genderOptions,
    saving: false,
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const localUserInfo = storage.getUserInfo();
    if (localUserInfo) {
      this.setUserForm(localUserInfo);
    }

    api.getUserInfo()
      .then((res) => {
        const userInfo = res?.data || {};
        storage.setUserInfo({ ...localUserInfo, ...userInfo });
        this.setUserForm({ ...localUserInfo, ...userInfo });
      })
      .catch((error) => {
        console.error('加载用户资料失败:', error);
      });
  },

  setUserForm(userInfo = {}) {
    this.setData({
      userInfo: {
        avatar: userInfo.avatar || '/images/default-avatar.png',
        phone: userInfo.phone || '',
      },
      form: {
        nickname: userInfo.nickname || '',
        genderIndex: this.getGenderIndex(userInfo.gender),
        bio: userInfo.bio || '',
      },
    });
  },

  getGenderIndex(gender) {
    const index = this.data.genderOptions.findIndex((item) => item.value === gender);
    return index >= 0 ? index : 0;
  },

  onNicknameInput(e) {
    this.setData({ 'form.nickname': e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ 'form.genderIndex': Number(e.detail.value) || 0 });
  },

  onBioInput(e) {
    this.setData({ 'form.bio': e.detail.value });
  },

  onAvatarTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res?.tempFiles?.[0]?.tempFilePath;
        if (!tempFilePath) {
          return;
        }
        this.uploadAvatar(tempFilePath);
      },
    });
  },

  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中', mask: true });

    api.uploadFile(filePath, 'avatar')
      .then((res) => {
        const avatarUrl = res?.data?.url || res?.data || '';
        if (!avatarUrl) {
          throw new Error('未返回头像地址');
        }
        this.setData({ 'userInfo.avatar': avatarUrl });
        wx.showToast({ title: '头像上传成功', icon: 'success' });
      })
      .catch((error) => {
        console.error('上传头像失败:', error);
        wx.showToast({ title: error.error || error.message || '上传失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  onBindPhone() {
    wx.navigateTo({ url: '/pages/auth/bind-phone/index' });
  },

  onSave() {
    const { form, userInfo, genderOptions: options } = this.data;
    const nickname = (form.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    if (this.data.saving) {
      return;
    }

    const updateData = {
      nickname,
      gender: options[form.genderIndex]?.value || '',
      bio: (form.bio || '').trim(),
      avatar: userInfo.avatar || '',
    };

    this.setData({ saving: true });

    api.updateUserInfo(updateData)
      .then((res) => {
        const updatedUserInfo = {
          ...(storage.getUserInfo() || {}),
          ...(res?.data || {}),
          ...updateData,
          phone: userInfo.phone || storage.getUserInfo()?.phone || '',
        };

        storage.setUserInfo(updatedUserInfo);
        this.setUserForm(updatedUserInfo);

        wx.showToast({ title: '资料已保存', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      })
      .catch((error) => {
        console.error('保存资料失败:', error);
        wx.showToast({ title: error.error || '保存失败，请稍后重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  },
});
