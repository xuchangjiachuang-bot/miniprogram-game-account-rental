const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const chat = require('../../utils/chat.js');
const config = require('../../utils/config.js');

Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '',
      id: '',
      isVerified: false,
      verifyStatus: 'none',
      tags: [],
    },
    stats: {
      orderCount: 0,
      collectCount: 0,
      balance: '0.00',
      creditScore: 0,
    },
    menuBadges: {
      order: 0,
      collect: 0,
    },
    showLoginModal: false,
  },

  onLoad() {
    const userInfo = storage.getUserInfo();
    if (!userInfo) {
      this.setData({ showLoginModal: true });
      return;
    }

    this.loadUserInfo();
  },

  onShow() {
    if (storage.getUserInfo()) {
      this.loadUserInfo();
    }
  },

  onPullDownRefresh() {
    this.loadUserInfo().finally(() => wx.stopPullDownRefresh());
  },

  onLoginSuccess(e) {
    const detail = e?.detail || {};
    if (detail.user) {
      storage.setUserInfo(detail.user);
    }
    this.setData({ showLoginModal: false });
    this.loadUserInfo();
  },

  showComingSoon(message = '该功能正在建设中') {
    wx.showToast({
      title: message,
      icon: 'none',
    });
  },

  loadUserInfo() {
    const localUserInfo = storage.getUserInfo();
    if (localUserInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          ...localUserInfo,
          avatar: localUserInfo.avatar || '/images/default-avatar.png',
          tags: this.buildUserTags(localUserInfo),
          isVerified: localUserInfo.isVerified || localUserInfo.verifyStatus === 'approved',
          verifyStatus: localUserInfo.verifyStatus || 'none',
        },
      });
    }

    return Promise.all([
      api.getUserInfo(),
      api.getUserStats(),
    ])
      .then(([userRes, statsRes]) => {
        const rawUser = userRes?.data || {};
        const userInfo = {
          ...rawUser,
          avatar: rawUser.avatar || '/images/default-avatar.png',
          isVerified: rawUser.isVerified || rawUser.verifyStatus === 'approved',
          verifyStatus: rawUser.verifyStatus || 'none',
          tags: this.buildUserTags(rawUser),
        };

        const stats = {
          orderCount: Number(statsRes?.data?.orderCount || 0),
          collectCount: Number(statsRes?.data?.collectCount || 0),
          balance: this.formatMoney(statsRes?.data?.balance),
          creditScore: Number(statsRes?.data?.creditScore || 0),
        };

        this.setData({
          userInfo,
          stats,
        });

        storage.setUserInfo(userInfo);
      })
      .catch((error) => {
        console.error('加载个人中心数据失败:', error);

        if (config.useMockData) {
          const mockData = require('../../utils/mock-data.js');
          const userInfo = mockData.userInfo || {
            id: 'MOCK_USER_001',
            nickname: '测试用户',
            avatar: '/images/default-avatar.png',
            isVerified: true,
            verifyStatus: 'approved',
            tags: ['已实名', '高信用'],
          };

          const stats = mockData.userStats || {
            orderCount: 12,
            collectCount: 5,
            balance: '520.00',
            creditScore: 750,
          };

          this.setData({ userInfo, stats });
        }
      });
  },

  buildUserTags(userInfo = {}) {
    const tags = [];

    if (userInfo.isVerified || userInfo.verifyStatus === 'approved') {
      tags.push('已实名');
    }
    if (Number(userInfo.creditScore || 0) >= 700) {
      tags.push('高信用');
    }
    if (Number(userInfo.rentCount || 0) > 100) {
      tags.push('资深租户');
    }

    return tags;
  },

  formatMoney(amount) {
    const value = Number(amount || 0);
    if (Number.isNaN(value)) return '0.00';
    return value.toFixed(2);
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit/index' });
  },

  onVerifyTap() {
    wx.navigateTo({ url: '/pages/profile/verify/index' });
  },

  onOrdersTap() {
    wx.navigateTo({ url: '/pages/order/list/index' });
  },

  onAccountTap() {
    wx.navigateTo({ url: '/pages/account/publish/index' });
  },

  onCollectTap() {
    this.showComingSoon();
  },

  onWalletTap() {
    wx.navigateTo({ url: '/pages/wallet/index' });
  },

  onAddressTap() {
    this.showComingSoon();
  },

  onSecurityTap() {
    this.showComingSoon();
  },

  onHelpTap() {
    this.showComingSoon();
  },

  onFeedbackTap() {
    this.showComingSoon();
  },

  onAboutTap() {
    this.showComingSoon();
  },

  onCreditTap() {
    wx.showModal({
      title: '信用分说明',
      content: '信用分会结合租号行为、履约记录和历史表现综合计算，分数越高可享受更多权益。',
      showCancel: false,
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前登录状态吗？',
      success: (res) => {
        if (!res.confirm) return;

        storage.removeToken();
        storage.removeUserInfo();
        if (chat && typeof chat.disconnect === 'function') {
          chat.disconnect();
        }

        wx.showToast({
          title: '已退出登录',
          icon: 'success',
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/auth/login/index' });
        }, 1200);
      },
    });
  },
});
