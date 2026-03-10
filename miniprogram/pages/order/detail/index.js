// pages/order/detail/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');
const orderTransformer = require('../../../utils/order-transformer.js');

Page({
  data: {
    orderId: null,
    order: {},
    account: {},
    orderStatusKey: '',
    statusIcon: '',
    statusDesc: '',
    showGameAccount: false,
    canChat: false,
    actions: [],
    loading: false
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

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载数据
   */
  loadData() {
    const that = this;

    if (that.data.loading) return;

    that.setData({ loading: true });

    api.getOrderDetail(that.data.orderId)
      .then(res => {
        const orderData = res.data;

        // 使用数据转换工具处理订单数据
        const transformedOrder = orderTransformer.transformOrder(orderData);

        // 处理账号信息
        const accountData = orderData.account || {};
        const account = {
          id: accountData.id,
          title: accountData.title || '游戏账号',
          avatar: accountData.screenshots?.[0] || '/images/default-account.png',
          gameAccount: accountData.username || '',
          gamePassword: accountData.password || '',
          gameVerify: accountData.verifyCode || '',
          coinsM: accountData.coinsM || 0,
          safeboxCount: accountData.safeboxCount || 0,
          staminaValue: accountData.staminaValue || 0,
          energyValue: accountData.energyValue || 0,
          customAttributes: accountData.customAttributes || {},
          tags: accountData.tags || []
        };

        that.setData({
          order: transformedOrder,
          account: account,
          loading: false
        });

        that.updateOrderStatus();
      })
      .catch(error => {
        console.error('加载订单详情失败:', error);
        that.setData({ loading: false });

        // 使用Mock数据
        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const mockOrder = mockData.orders?.find(o => o.id === that.data.orderId) || mockData.orders?.[0];

          if (mockOrder) {
            const transformedOrder = orderTransformer.transformOrder(mockOrder);
            const account = {
              id: mockOrder.accountId,
              title: mockOrder.accountName || '游戏账号',
              avatar: mockOrder.accountImage || '/images/default-account.png',
              gameAccount: mockOrder.gameAccount || 'test_account',
              gamePassword: mockOrder.gamePassword || '123456',
              gameVerify: mockOrder.gameVerify || '',
              coinsM: mockOrder.coinsM || 120,
              safeboxCount: mockOrder.safeboxCount || 6,
              staminaValue: mockOrder.staminaValue || 6,
              energyValue: mockOrder.energyValue || 7,
              customAttributes: mockOrder.customAttributes || {},
              tags: mockOrder.tags || []
            };

            that.setData({
              order: transformedOrder,
              account: account,
              loading: false
            });

            that.updateOrderStatus();
          }
        } else {
          wx.showToast({
            title: error.error || '加载失败',
            icon: 'none'
          });
        }
      });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus() {
    const order = this.data.order;
    const statusConfig = {
      'pending_payment': {
        key: 'pending',
        icon: '⏰',
        desc: '请尽快完成支付',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'cancel', text: '取消订单', type: 'danger' },
          { action: 'pay', text: '立即支付', type: 'primary' }
        ]
      },
      'paid': {
        key: 'paid',
        icon: '💳',
        desc: '等待卖家确认',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'cancel', text: '取消订单', type: 'danger' }
        ]
      },
      'pending_start': {
        key: 'pending_start',
        icon: '📅',
        desc: '等待租赁开始',
        showGameAccount: false,
        canChat: true,
        actions: [
          { action: 'chat', text: '联系客服', type: 'primary' }
        ]
      },
      'renting': {
        key: 'active',
        icon: '🎮',
        desc: '正在租赁中',
        showGameAccount: true,
        canChat: true,
        actions: [
          { action: 'chat', text: '进入聊天', type: 'primary' },
          { action: 'extend', text: '续租', type: 'default' }
        ]
      },
      'completed': {
        key: 'completed',
        icon: '✅',
        desc: '订单已完成',
        showGameAccount: false,
        canChat: false,
        actions: [
          { action: 'reorder', text: '再次租赁', type: 'primary' }
        ]
      },
      'cancelled': {
        key: 'cancelled',
        icon: '❌',
        desc: '订单已取消',
        showGameAccount: false,
        canChat: false,
        actions: []
      },
      'refunded': {
        key: 'refunded',
        icon: '💰',
        desc: '已退款',
        showGameAccount: false,
        canChat: false,
        actions: []
      },
      'dispute': {
        key: 'dispute',
        icon: '⚠️',
        desc: '争议处理中',
        showGameAccount: true,
        canChat: true,
        actions: [
          { action: 'chat', text: '协商处理', type: 'primary' },
          { action: 'appeal', text: '申诉', type: 'danger' }
        ]
      }
    };

    const config = statusConfig[order.status] || statusConfig['pending_payment'];

    this.setData({
      orderStatusKey: config.key,
      statusIcon: config.icon,
      statusDesc: config.desc,
      showGameAccount: config.showGameAccount,
      canChat: config.canChat,
      actions: config.actions
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
   * 复制密码
   */
  onCopyPassword(e) {
    const password = e.currentTarget.dataset.password;

    wx.setClipboardData({
      data: password,
      success() {
        wx.showToast({
          title: '密码已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 进入聊天
   */
  onChat() {
    wx.navigateTo({
      url: `/pages/chat/index?orderId=${this.data.orderId}`
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
      case 'chat':
        this.onChat();
        break;
      case 'appeal':
        this.handleAppeal();
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
   * 退租/取消
   */
  handleCancel() {
    const that = this;
    const isRenting = that.data.order.status === 'renting';

    wx.showModal({
      title: isRenting ? '确认退租' : '确认取消',
      content: isRenting
        ? '退租后订单将被取消，将根据实际租期退款。确认退租吗？'
        : '取消后订单将被删除，确认取消吗？',
      success(res) {
        if (res.confirm) {
          that.submitCancel();
        }
      }
    });
  },

  /**
   * 提交取消/退租
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
          title: '操作成功',
          icon: 'success'
        });

        setTimeout(() => {
          that.loadData();
        }, 1500);
      })
      .catch(error => {
        wx.hideLoading();

        wx.showToast({
          title: error.error || '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 延长租期
   */
  handleExtend() {
    wx.navigateTo({
      url: `/pages/account/detail/index?id=${this.data.account.id}`
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
   * 申诉
   */
  handleAppeal() {
    wx.navigateTo({
      url: `/pages/order/appeal/index?id=${this.data.orderId}`
    });
  }
});
