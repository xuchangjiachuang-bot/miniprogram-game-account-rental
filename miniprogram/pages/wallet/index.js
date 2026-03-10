// pages/wallet/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const config = require('../../utils/config.js');

Page({
  data: {
    wallet: {
      balance: '0.00',
      totalRecharge: '0.00',
      totalWithdraw: '0.00',
      availableBalance: '0.00'
    },
    statistics: null,
    currentPeriod: 'month',
    periodList: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' }
    ],
    transactions: []
  },

  onLoad() {
    console.log('钱包页面加载');
    this.loadWalletInfo();
    this.loadStatistics();
    this.loadTransactions();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadWalletInfo();
    this.loadStatistics();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadWalletInfo(),
      this.loadStatistics(),
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
            balance: that.formatMoney(data.balance || data.availableBalance),
            totalRecharge: that.formatMoney(data.totalRecharge || data.totalEarned),
            totalWithdraw: that.formatMoney(data.totalWithdraw || data.totalWithdrawn),
            availableBalance: that.formatMoney(data.availableBalance)
          }
        });
      })
      .catch(error => {
        console.error('加载钱包信息失败:', error);
        
        // 使用Mock数据
        if (config.useMockData) {
          const mockData = require('../../utils/mock-data.js');
          const wallet = mockData.wallet || {
            balance: 520.00,
            totalRecharge: 1000.00,
            totalWithdraw: 480.00,
            availableBalance: 520.00
          };
          
          that.setData({
            wallet: {
              balance: that.formatMoney(wallet.balance),
              totalRecharge: that.formatMoney(wallet.totalRecharge),
              totalWithdraw: that.formatMoney(wallet.totalWithdraw),
              availableBalance: that.formatMoney(wallet.availableBalance)
            }
          });
        }
      });
  },

  /**
   * 加载统计数据
   */
  loadStatistics() {
    const that = this;
    const { currentPeriod } = this.data;
    
    api.getWalletStatistics(currentPeriod)
      .then(res => {
        const { data } = res;
        
        that.setData({
          statistics: data
        });
      })
      .catch(error => {
        console.error('加载统计数据失败:', error);
        
        // 使用Mock数据
        if (config.useMockData) {
          const mockData = require('../../utils/mock-data.js');
          const statistics = mockData.statistics || {
            summary: {
              totalIncome: 500.00,
              totalExpense: 200.00,
              netIncome: 300.00,
              incomeCount: 5,
              expenseCount: 8
            },
            dailyStats: [
              { date: '2026-02-01', income: 100.00, expense: 50.00 },
              { date: '2026-02-02', income: 0.00, expense: 30.00 },
              { date: '2026-02-03', income: 200.00, expense: 80.00 }
            ]
          };
          
          that.setData({
            statistics: statistics
          });
        }
      });
  },

  /**
   * 切换统计周期
   */
  onPeriodChange(e) {
    const index = e.detail.value;
    const periodList = this.data.periodList;
    const currentPeriod = periodList[index].value;
    
    this.setData({
      currentPeriod
    });
    
    this.loadStatistics();
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
          type: item.amount >= 0 ? 'income' : 'expense',
          amount_display: that.formatMoney(Math.abs(item.amount))
        };
      });
      
      that.setData({
        transactions: processedTransactions
      });
    })
    .catch(error => {
      console.error('加载交易记录失败:', error);
      
      // 使用Mock数据
      if (config.useMockData) {
        const mockData = require('../../utils/mock-data.js');
        const transactions = mockData.transactions || [
          {
            id: 'TXN_001',
            type: 'order_payment',
            amount: -10.00,
            title: '账号租赁',
            createTime: new Date().getTime() - 7200000
          },
          {
            id: 'TXN_002',
            type: 'recharge',
            amount: 100.00,
            title: '微信充值',
            createTime: new Date().getTime() - 86400000
          }
        ];
        
        const processedTransactions = transactions.map(item => {
          return {
            ...item,
            icon: that.getTransactionIcon(item.type),
            type: item.amount >= 0 ? 'income' : 'expense',
            amount_display: that.formatMoney(Math.abs(item.amount))
          };
        });
        
        that.setData({
          transactions: processedTransactions
        });
      }
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
   * 查看月度账单
   */
  onMonthlyBillTap() {
    const now = new Date();
    wx.navigateTo({
      url: `/pages/wallet/bill/index?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
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
   * 查看统计详情
   */
  onStatisticsTap() {
    wx.navigateTo({
      url: '/pages/wallet/statistics/index'
    });
  }
});
