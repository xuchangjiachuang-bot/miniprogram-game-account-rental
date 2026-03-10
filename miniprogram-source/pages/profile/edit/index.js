// pages/profile/edit/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    userInfo: {},
    form: {
      nickname: '',
      genderIndex: 0,
      bio: ''
    },
    genderOptions: [
      { label: '请选择', value: '' },
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '保密', value: 'secret' }
    ],
    saving: false
  },

  onLoad(options) {
    console.log('个人资料编辑页面加载');
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const that = this;
    
    // 从本地获取用户信息
    const localUserInfo = storage.getUserInfo();
    if (localUserInfo) {
      that.setData({
        userInfo: localUserInfo,
        form: {
          nickname: localUserInfo.nickname || '',
          genderIndex: that.getGenderIndex(localUserInfo.gender),
          bio: localUserInfo.bio || ''
        }
      });
    }
    
    // 从服务器获取最新信息
    api.getUserInfo()
      .then(res => {
        const userInfo = res.data;
        that.setData({
          userInfo,
          form: {
            nickname: userInfo.nickname || '',
            genderIndex: that.getGenderIndex(userInfo.gender),
            bio: userInfo.bio || ''
          }
        });
      })
      .catch(error => {
        console.error('加载用户信息失败:', error);
      });
  },

  /**
   * 获取性别索引
   */
  getGenderIndex(gender) {
    const index = this.data.genderOptions.findIndex(opt => opt.value === gender);
    return index >= 0 ? index : 0;
  },

  /**
   * 昵称输入
   */
  onNicknameInput(e) {
    this.setData({
      'form.nickname': e.detail.value
    });
  },

  /**
   * 性别选择
   */
  onGenderChange(e) {
    this.setData({
      'form.genderIndex': parseInt(e.detail.value)
    });
  },

  /**
   * 个性签名输入
   */
  onBioInput(e) {
    this.setData({
      'form.bio': e.detail.value
    });
  },

  /**
   * 点击头像
   */
  onAvatarTap() {
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.uploadAvatar(tempFilePath);
      }
    });
  },

  /**
   * 上传头像
   */
  uploadAvatar(filePath) {
    const that = this;
    
    wx.showLoading({
      title: '上传中...',
      mask: true
    });
    
    api.uploadFile(filePath, 'avatar')
      .then(res => {
        const avatarUrl = res.data.url;
        
        // 更新本地数据
        that.setData({
          'userInfo.avatar': avatarUrl
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '头像上传成功',
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('上传头像失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: error.error || '上传失败',
          icon: 'none'
        });
      });
  },

  /**
   * 绑定手机号
   */
  onBindPhone() {
    wx.navigateTo({
      url: '/pages/auth/phone-binding/index'
    });
  },

  /**
   * 保存
   */
  onSave() {
    const that = this;
    const { form, userInfo } = that.data;
    
    // 验证
    if (!form.nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    // 构建提交数据
    const updateData = {
      nickname: form.nickname,
      gender: that.data.genderOptions[form.genderIndex].value,
      bio: form.bio
    };
    
    // 如果有新头像
    if (userInfo.avatar && userInfo.avatar !== that.data.userInfo.avatar) {
      updateData.avatar = userInfo.avatar;
    }
    
    that.setData({ saving: true });
    
    api.updateUserInfo(updateData)
      .then(res => {
        const updatedUserInfo = res.data;
        
        // 更新本地缓存
        storage.setUserInfo(updatedUserInfo);
        
        that.setData({
          userInfo: updatedUserInfo,
          saving: false
        });
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(error => {
        console.error('保存失败:', error);
        that.setData({ saving: false });
        
        wx.showToast({
          title: error.error || '保存失败',
          icon: 'none'
        });
      });
  }
});
