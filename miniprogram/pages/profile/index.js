const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const chat = require('../../utils/chat.js');
const config = require('../../utils/config.js');

function formatMoney(amount) {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

function buildUserTags(userInfo = {}) {
  const tags = [];

  if (userInfo.isVerified || userInfo.verifyStatus === 'approved') {
    tags.push('已实名');
  }
  if (Number(userInfo.creditScore || 0) >= 700) {
    tags.push('高信用');
  }
  if (Number(userInfo.rentCount || 0) > 100) {
    tags.push('资深租号用户');
  }

  return tags;
}

function buildStatCards(stats = {}) {
  return [
    { key: 'orders', label: '订单', value: String(stats.orderCount || 0), action: 'orders' },
    { key: 'collect', label: '收藏', value: String(stats.collectCount || 0), action: 'collect' },
    { key: 'balance', label: '余额', value: `¥${stats.balance || '0.00'}`, action: 'wallet' },
    { key: 'credit', label: '信用分', value: String(stats.creditScore || 0), action: 'credit' },
  ];
}

function buildMenuSections(menuBadges = {}) {
  return [
    {
      key: 'trade',
      items: [
        { action: 'orders', shortLabel: '单', title: '我的订单', desc: '查看租号订单与处理进度', badge: menuBadges.order || '' },
        { action: 'account', shortLabel: '号', title: '我的账号', desc: '发布和管理上架账号' },
        { action: 'collect', shortLabel: '藏', title: '我的收藏', desc: '暂存感兴趣的账号', badge: menuBadges.collect || '' },
      ],
    },
    {
      key: 'asset',
      items: [
        { action: 'wallet', shortLabel: '钱', title: '我的钱包', desc: '查看余额、充值与提现' },
        { action: 'address', shortLabel: '址', title: '收货地址', desc: '用于后续扩展的实物配送' },
        { action: 'security', shortLabel: '安', title: '账户安全', desc: '管理登录与账户安全设置' },
      ],
    },
    {
      key: 'service',
      items: [
        { action: 'help', shortLabel: '帮', title: '帮助中心', desc: '查看常见问题与使用说明' },
        { action: 'feedback', shortLabel: '评', title: '意见反馈', desc: '告诉我们你遇到的问题' },
        { action: 'about', shortLabel: '关', title: '关于我们', desc: '了解平台信息与服务说明' },
      ],
    },
    {
      key: 'logout',
      items: [
        { action: 'logout', shortLabel: '退', title: '退出登录', desc: '退出当前账号并返回登录页', danger: true },
      ],
    },
  ];
}

Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '',
      id: '',
      isVerified: false,
      verifyStatus: 'none',
      verifyText: '未实名',
      tags: [],
    },
    stats: {
      orderCount: 0,
      collectCount: 0,
      balance: '0.00',
      creditScore: 0,
    },
    menuBadges: {
      order: '',
      collect: '',
    },
    statCards: [],
    menuSections: [],
    memberText: '欢迎使用账号租赁',
    showLoginModal: false,
    loading: false,
    errorText: '',
  },

  onLoad() {
    const userInfo = storage.getUserInfo();
    this.setData({
      statCards: buildStatCards(this.data.stats),
      menuSections: buildMenuSections(this.data.menuBadges),
    });

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

  applyProfileState(userInfo = {}, stats = this.data.stats) {
    const normalizedUser = {
      ...this.data.userInfo,
      ...userInfo,
      avatar: userInfo.avatar || '/images/default-avatar.png',
      isVerified: userInfo.isVerified || userInfo.verifyStatus === 'approved',
      verifyStatus: userInfo.verifyStatus || 'none',
      verifyText: userInfo.isVerified || userInfo.verifyStatus === 'approved' ? '已实名' : '未实名',
      tags: buildUserTags(userInfo),
    };

    const normalizedStats = {
      orderCount: Number(stats.orderCount || 0),
      collectCount: Number(stats.collectCount || 0),
      balance: formatMoney(stats.balance),
      creditScore: Number(stats.creditScore || 0),
    };

    this.setData({
      userInfo: normalizedUser,
      stats: normalizedStats,
      memberText: normalizedUser.id ? `会员编号 ${normalizedUser.id}` : '欢迎使用账号租赁',
      statCards: buildStatCards(normalizedStats),
      menuSections: buildMenuSections(this.data.menuBadges),
    });
  },

  onLoginSuccess(e) {
    const detail = e && e.detail ? e.detail : {};
    if (detail.user) {
      storage.setUserInfo(detail.user);
    }
    this.setData({ showLoginModal: false });
    this.loadUserInfo();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  showComingSoon(message = '该功能即将上线') {
    wx.showToast({
      title: message,
      icon: 'none',
    });
  },

  loadUserInfo() {
    const localUserInfo = storage.getUserInfo();
    if (!localUserInfo) {
      return Promise.resolve();
    }

    this.applyProfileState(localUserInfo, this.data.stats);
    this.setData({ loading: true, errorText: '' });

    return Promise.all([
      api.getUserInfo(),
      api.getUserStats(),
    ])
      .then(([userRes, statsRes]) => {
        const rawUser = userRes && userRes.data ? userRes.data : {};
        const statsSource = statsRes && statsRes.data ? statsRes.data : {};
        const userInfo = {
          ...rawUser,
          avatar: rawUser.avatar || '/images/default-avatar.png',
          isVerified: rawUser.isVerified || rawUser.verifyStatus === 'approved',
          verifyStatus: rawUser.verifyStatus || 'none',
          creditScore: Number(statsSource.creditScore || rawUser.creditScore || 0),
        };

        const stats = {
          orderCount: Number(statsSource.orderCount || 0),
          collectCount: Number(statsSource.collectCount || 0),
          balance: statsSource.balance,
          creditScore: Number(statsSource.creditScore || 0),
        };

        this.applyProfileState(userInfo, stats);
        storage.setUserInfo({
          ...userInfo,
          tags: buildUserTags(userInfo),
          verifyText: userInfo.isVerified ? '已实名' : '未实名',
        });
        this.setData({ errorText: '' });
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
            creditScore: 750,
          };

          const stats = mockData.userStats || {
            orderCount: 12,
            collectCount: 5,
            balance: '520.00',
            creditScore: 750,
          };

          this.applyProfileState(userInfo, stats);
          this.setData({ errorText: '' });
          return;
        }

        this.setData({
          errorText: error && error.error ? error.error : '个人中心数据刷新失败，请稍后重试。',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onRetry() {
    this.loadUserInfo();
  },

  onStatTap(e) {
    const action = e.currentTarget.dataset.action;
    this.handleMenuAction(action);
  },

  onMenuTap(e) {
    const action = e.currentTarget.dataset.action;
    this.handleMenuAction(action);
  },

  handleMenuAction(action) {
    switch (action) {
      case 'orders':
        wx.navigateTo({ url: '/pages/order/list/index' });
        break;
      case 'account':
        wx.navigateTo({ url: '/pages/account/publish/index' });
        break;
      case 'wallet':
        wx.navigateTo({ url: '/pages/wallet/index' });
        break;
      case 'verify':
        wx.navigateTo({ url: '/pages/profile/verify/index' });
        break;
      case 'credit':
        this.onCreditTap();
        break;
      case 'logout':
        this.onLogout();
        break;
      case 'collect':
      case 'address':
      case 'security':
      case 'help':
      case 'feedback':
      case 'about':
        this.showComingSoon();
        break;
      default:
        break;
    }
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit/index' });
  },

  onVerifyTap() {
    this.handleMenuAction('verify');
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
      title: '确认退出登录',
      content: '退出后需要重新授权登录，才能继续下单和查看个人数据。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

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
