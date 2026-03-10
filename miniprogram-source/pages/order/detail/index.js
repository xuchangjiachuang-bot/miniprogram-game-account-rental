// pages/order/detail/index.js
const api = require('../../../utils/api.js');

Page({
  data: {
    orderId: null,
    order: {},
    account: {},
    orderStatusKey: '',
    statusIcon: '',
    showGameAccount: false,
    canChat: false,
    actions: []
  },

  onLoad(options) {
    console.log('订单详情页面加载', options);
    
    if (!options.id) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ orderId: options.id });
    this.loadData();
  },

  onShow() {
    if (this.data.orderId) {
      this.loadData();
    }
  },

  /**
   * 加载数据
   */
  loadData() {
    const that = this;
    
    api.getOrderDetail(that.data.orderId)
      .then(res => {
        that.setData({
          order: res.data.order,
          account: res.data.account
        });
        
        that.updateOrderStatus();
      })
      .catch(error => {
        console.error('加载订单详情失败:', error);
        wx.showToast({
          title: error.error || '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus() {
    const order = this.data.order;
    let statusKey = '';
    let statusIcon = '';
    let showGameAccount = false;
    let canChat = false;
    let actions = [];
    
    switch (order.status) {
      case 'pending':
        statusKey = 'pending';
        statusIcon = '⏰';
        canChat = true;
        actions = [
          { action: 'cancel', text: '取消订单', primary: false },
          { action: 'pay', text: '立即支付', primary: true }
        ];
        break;
        
      case 'paid':
        statusKey = 'paid';
        statusIcon = '💳';
        canChat = true;
        actions = [
          { action: 'cancel', text: '退租退款', primary: false }
        ];
        break;
        
      case 'active':
        statusKey = 'active';
        statusIcon = '🎮';
        showGameAccount = true;
        canChat = true;
        actions = [
          { action: 'cancel', text: '提前退租', primary: false },
          { action: 'extend', text: '延长租期', primary: true }
        ];
        break;
        
      case 'completed':
        statusKey = 'completed';
        statusIcon = '✅';
        canChat = false;
        actions = [
          { action: 'reorder', text: '再次租赁', primary: true }
        ];
        break;
        
      case 'cancelled':
        statusKey = 'cancelled';
        statusIcon = '❌';
        canChat = false;
        actions = [];
        break;
        
      case 'refunded':
        statusKey = 'refunded';
        statusIcon = '💰';
        canChat = false;
        actions = [];
        break;
    }
    
    this.setData({
      orderStatusKey: statusKey,
      statusIcon,
      showGameAccount,
      canChat,
      actions
    });
  },

  /**
   * 复制游戏账号
   */
  onCopyAccount(e) {
    const account = e.currentTarget.dataset.account;
    
    wx.setClipboardData({
      data: account,
      success() {
        wx.showToast({
          title: '账号已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 操作按钮点击
   */
  onActionTap(e) {
    const action = e.currentTarget.dataset.action;
    
    switch (action) {
      case 'pay':
        this.handlePay();
        break;
      case 'cancel':
        this.handleCancel();
        break;
      case 'extend':
        this.handleExtend();
        break;
      case 'reorder':
        this.handleReorder();
        break;
    }
  },

  /**
   * 支付
   */
  handlePay() {
    wx.navigateTo({
      url: `/pages/order/payment/index?id=${this.data.orderId}`
    });
  },

  /**
   * 退租
   */
  handleCancel() {
    const that = this;
    
    wx.showModal({
      title: '确认退租',
      content: '退租后订单将被取消，将根据实际租期退款。确认退租吗？',
      success(res) {
        if (res.confirm) {
          that.submitCancel();
        }
      }
    });
  },

  /**
   * 提交退租
   */
  submitCancel() {
    const that = this;
    
    wx.showLoading({
      title: '提交中...'
    });
    
    api.cancelOrder(that.data.orderId)
      .then(res => {
        wx.hideLoading();
        
        wx.showToast({
          title: '退租申请已提交',
          icon: 'success'
        });
        
        setTimeout(() => {
          that.loadData();
        }, 1500);
      })
      .catch(error => {
        wx.hideLoading();
        
        wx.showToast({
          title: error.error || '退租失败',
          icon: 'none'
        });
      });
  },

  /**
   * 延长租期
   */
  handleExtend() {
    wx.navigateTo({
      url: `/pages/account/detail/index?id=${this.data.account.id}&from=order`
    });
  },

  /**
   * 再次租赁
   */
  handleReorder() {
    wx.navigateTo({
      url: `/pages/account/detail/index?id=${this.data.account.id}`
    });
  },

  /**
   * 聊天
   */
  onChat() {
    if (!this.data.order.chatGroupId) {
      wx.showToast({
        title: '暂无聊天群',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/chat/detail/index?groupId=${this.data.order.chatGroupId}`
    });
  }
});
