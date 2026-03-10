// pages/wallet/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');

Page({
  data: {
    wallet: {
      balance: '0.00',
      totalRecharge: '0.00',
      totalWithdraw: '0.00',
      availableBalance: '0.00'
    },
    transactions: []
  },

  onLoad() {
    console.log('钱包页面加载');
    this.loadWalletInfo();
    this.loadTransactions();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadWalletInfo();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadWalletInfo(),
      this.loadTransactions()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载钱包信息
   */
  loadWalletInfo() {
    const that = this;
    
    api.getWalletInfo()
      .then(res => {
        const { data } = res;
        
        that.setData({
          wallet: {
            balance: that.formatMoney(data.balance),
            totalRecharge: that.formatMoney(data.totalRecharge),
            totalWithdraw: that.formatMoney(data.totalWithdraw),
            availableBalance: that.formatMoney(data.availableBalance)
          }
        });
      })
      .catch(error => {
        console.error('加载钱包信息失败:', error);
      });
  },

  /**
   * 加载交易记录
   */
  loadTransactions() {
    const that = this;
    
    api.getTransactions({
      limit: 10
    })
    .then(res => {
      const { data } = res;
      const transactions = data.list || [];
      
      // 处理交易记录
      const processedTransactions = transactions.map(item => {
        return {
          ...item,
          icon: that.getTransactionIcon(item.type),
          type: item.amount >= 0 ? 'income' : 'expense'
        };
      });
      
      that.setData({
        transactions: processedTransactions
      });
    })
    .catch(error => {
      console.error('加载交易记录失败:', error);
    });
  },

  /**
   * 获取交易图标
   */
  getTransactionIcon(type) {
    const iconMap = {
      'recharge': '/images/icons/recharge.png',
      'withdraw': '/images/icons/withdraw.png',
      'order_payment': '/images/icons/order.png',
      'order_refund': '/images/icons/refund.png',
      'income': '/images/icons/income.png',
      'expense': '/images/icons/expense.png'
    };
    return iconMap[type] || '/images/icons/default.png';
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 明细
   */
  onDetailTap() {
    wx.navigateTo({
      url: '/pages/wallet/transactions/index'
    });
  },

  /**
   * 充值
   */
  onRechargeTap() {
    wx.navigateTo({
      url: '/pages/wallet/recharge/index'
    });
  },

  /**
   * 提现
   */
  onWithdrawTap() {
    wx.navigateTo({
      url: '/pages/wallet/withdraw/index'
    });
  },

  /**
   * 全部交易
   */
  onTransactionsTap() {
    wx.navigateTo({
      url: '/pages/wallet/transactions/index'
    });
  },

  /**
   * 点击交易记录
   */
  onTransactionTap(e) {
    const { transaction } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/wallet/transaction-detail/index?id=${transaction.id}`
    });
  }
});
