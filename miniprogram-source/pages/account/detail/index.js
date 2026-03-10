// pages/account/detail/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    id: '',
    account: {}
  },

  onLoad(options) {
    console.log('账号详情页面加载', options);
    
    this.setData({ id: options.id });
    this.loadAccountDetail();
  },

  onShareAppMessage() {
    const { account } = this.data;
    return {
      title: `${account.account_name} - 哈夫币${account.coins}`,
      path: `/pages/account/detail/index?id=${account.id}`,
      imageUrl: account.images[0]
    };
  },

  /**
   * 加载账号详情
   */
  loadAccountDetail() {
    const that = this;
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    api.getAccountDetail(that.data.id)
      .then(res => {
        const { data } = res;
        
        // 处理数据
        const account = {
          ...data,
          statusText: that.getStatusText(data.status),
          coins_display: that.formatNumber(data.coins),
          ratio_display: data.ratio ? (data.ratio * 100).toFixed(1) + '%' : '-',
          loginMethodText: that.getLoginMethodText(data.loginMethod)
        };
        
        that.setData({ account });
        wx.hideLoading();
      })
      .catch(error => {
        console.error('加载账号详情失败:', error);
        wx.hideLoading();
        
        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'available': '可租赁',
      'renting': '租赁中',
      'off_shelf': '已下架'
    };
    return statusMap[status] || status;
  },

  /**
   * 获取登录方式文本
   */
  getLoginMethodText(method) {
    const methodMap = {
      'wechat': 'Wegame · 微信扫码',
      'qq': 'Wegame · QQ账号密码',
      'steam': 'Steam · 账号密码'
    };
    return methodMap[method] || method;
  },

  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * 预览图片
   */
  onImagePreview(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current
    });
  },

  /**
   * 点击出租方
   */
  onOwnerTap() {
    const { account } = this.data;
    wx.navigateTo({
      url: `/pages/user/profile/index?id=${account.owner.id}`
    });
  },

  /**
   * 分享
   */
  onShare() {
    // 触发分享
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  /**
   * 收藏/取消收藏
   */
  onCollect() {
    const { account, id } = this.data;
    
    const action = account.isCollected ? 'remove' : 'add';
    const apiMethod = action === 'add' ? api.addCollect : api.removeCollect;
    
    apiMethod(id)
      .then(() => {
        that.setData({
          'account.isCollected': !account.isCollected
        });
        
        wx.showToast({
          title: action === 'add' ? '收藏成功' : '取消成功',
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('收藏失败:', error);
        wx.showToast({
          title: error.error || '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 立即租赁
   */
  onRent() {
    const userInfo = storage.getUserInfo();
    
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/login/index'
            });
          }
        }
      });
      return;
    }
    
    if (!userInfo.isVerified) {
      wx.showModal({
        title: '提示',
        content: '请先完成实名认证',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user/verify/index'
            });
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/order/create/index?accountId=${this.data.id}`
    });
  }
});
