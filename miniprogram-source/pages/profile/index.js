// pages/profile/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const chat = require('../../utils/chat.js');

Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '',
      id: '',
      isVerified: false,
      tags: []
    },
    stats: {
      orderCount: 0,
      collectCount: 0,
      balance: '0.00',
      creditScore: 0
    },
    menuBadges: {
      order: 0,
      collect: 0
    }
  },

  onLoad() {
    console.log('个人中心页面加载');
    this.loadUserInfo();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadUserInfo();
  },

  onPullDownRefresh() {
    this.loadUserInfo().then(() => {
      wx.stopPullDownRefresh();
    });
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
        userInfo: localUserInfo
      });
    }
    
    // 从服务器获取最新信息
    Promise.all([
      api.getUserInfo(),
      api.getUserStats()
    ])
    .then(([userRes, statsRes]) => {
      const userInfo = {
        ...userRes.data,
        tags: that.buildUserTags(userRes.data)
      };
      
      const stats = {
        orderCount: statsRes.data.orderCount || 0,
        collectCount: statsRes.data.collectCount || 0,
        balance: that.formatMoney(statsRes.data.balance),
        creditScore: statsRes.data.creditScore || 0
      };
      
      that.setData({
        userInfo,
        stats
      });
      
      // 更新本地缓存
      storage.setUserInfo(userInfo);
    })
    .catch(error => {
      console.error('加载用户信息失败:', error);
    });
  },

  /**
   * 构建用户标签
   */
  buildUserTags(userInfo) {
    const tags = [];
    
    if (userInfo.isVerified) {
      tags.push('已实名');
    }
    
    if (userInfo.creditScore >= 700) {
      tags.push('高信用');
    }
    
    if (userInfo.rentCount > 100) {
      tags.push('资深租户');
    }
    
    return tags;
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 编辑资料
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit/index'
    });
  },

  /**
   * 去认证
   */
  onVerifyTap() {
    wx.navigateTo({
      url: '/pages/profile/verification/index'
    });
  },

  /**
   * 我的订单
   */
  onOrdersTap() {
    wx.navigateTo({
      url: '/pages/order/list/index'
    });
  },

  /**
   * 我的账号
   */
  onAccountTap() {
    wx.navigateTo({
      url: '/pages/account/my/index'
    });
  },

  /**
   * 我的收藏
   */
  onCollectTap() {
    wx.navigateTo({
      url: '/pages/collect/list/index'
    });
  },

  /**
   * 我的钱包
   */
  onWalletTap() {
    wx.switchTab({
      url: '/pages/wallet/index'
    });
  },

  /**
   * 收货地址
   */
  onAddressTap() {
    wx.navigateTo({
      url: '/pages/address/list/index'
    });
  },

  /**
   * 账户安全
   */
  onSecurityTap() {
    wx.navigateTo({
      url: '/pages/profile/security/index'
    });
  },

  /**
   * 帮助中心
   */
  onHelpTap() {
    wx.navigateTo({
      url: '/pages/help/index/index'
    });
  },

  /**
   * 意见反馈
   */
  onFeedbackTap() {
    wx.navigateTo({
      url: '/pages/feedback/index/index'
    });
  },

  /**
   * 关于我们
   */
  onAboutTap() {
    wx.navigateTo({
      url: '/pages/about/index/index'
    });
  },

  /**
   * 信用分
   */
  onCreditTap() {
    wx.showModal({
      title: '信用分说明',
      content: '信用分根据您的租赁行为、履约记录等综合评定。高分用户可享受更多优惠和特权。',
      showCancel: false
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    const that = this;
    
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          // 清除登录信息
          storage.removeToken();
          storage.removeUserInfo();
          
          // 断开聊天连接
          chat.disconnect();
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          
          // 跳转到登录页
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/auth/login/index'
            });
          }, 1500);
        }
      }
    });
  }
});
