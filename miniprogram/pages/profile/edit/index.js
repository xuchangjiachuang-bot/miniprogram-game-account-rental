const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    userInfo: {},
    form: {
      nickname: '',
      genderIndex: 0,
      bio: '',
    },
    genderOptions: [
      { label: '请选择', value: '' },
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '保密', value: 'secret' },
    ],
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
        this.setUserForm(userInfo);
      })
      .catch((error) => {
        console.error('加载用户信息失败:', error);
      });
  },

  setUserForm(userInfo = {}) {
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...userInfo,
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
        if (!tempFilePath) return;
        this.uploadAvatar(tempFilePath);
      },
    });
  },

  uploadAvatar(filePath) {
    wx.showLoading({
      title: '上传中...',
      mask: true,
    });

    api.uploadFile(filePath, 'avatar')
      .then((res) => {
        const avatarUrl = res?.data?.url || '';
        this.setData({
          'userInfo.avatar': avatarUrl,
        });
        wx.showToast({
          title: '头像上传成功',
          icon: 'success',
        });
      })
      .catch((error) => {
        console.error('上传头像失败:', error);
        wx.showToast({
          title: error.error || '上传失败',
          icon: 'none',
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  onBindPhone() {
    wx.navigateTo({
      url: '/pages/auth/bind-phone/index',
    });
  },

  onSave() {
    const { form, userInfo, genderOptions } = this.data;
    if (!form.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
      });
      return;
    }

    if (this.data.saving) return;

    const updateData = {
      nickname: form.nickname.trim(),
      gender: genderOptions[form.genderIndex]?.value || '',
      bio: form.bio || '',
      avatar: userInfo.avatar || '',
    };

    this.setData({ saving: true });

    api.updateUserInfo(updateData)
      .then((res) => {
        const updatedUserInfo = {
          ...userInfo,
          ...(res?.data || {}),
          ...updateData,
        };

        storage.setUserInfo(updatedUserInfo);
        this.setData({ userInfo: updatedUserInfo });

        wx.showToast({
          title: '保存成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      })
      .catch((error) => {
        console.error('保存资料失败:', error);
        wx.showToast({
          title: error.error || '保存失败',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  },
});
