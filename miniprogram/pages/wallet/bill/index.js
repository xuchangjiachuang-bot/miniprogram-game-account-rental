// pages/wallet/bill/index.js
const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    bill: null,
    monthList: [],
    selectedMonthIndex: 0
  },

  onLoad(options) {
    console.log('月度账单页面加载', options);
    
    const { year, month } = options;
    
    if (year && month) {
      this.setData({
        year: parseInt(year),
        month: parseInt(month)
      });
    }
    
    this.initMonthList();
    this.loadBill();
  },

  /**
   * 初始化月份列表
   */
  initMonthList() {
    const { year } = this.data;
    const now = new Date();
    const monthList = [];
    
    // 生成过去12个月的列表
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, now.getMonth() - i, 1);
      monthList.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`
      });
    }
    
    this.setData({
      monthList,
      selectedMonthIndex: 0
    });
  },

  /**
   * 加载账单数据
   */
  loadBill() {
    const that = this;
    const { year, month } = this.data;
    
    api.getMonthlyBill(year, month)
      .then(res => {
        const { data } = res;
        
        that.setData({
          bill: data
        });
      })
      .catch(error => {
        console.error('加载账单失败:', error);
        
        // 使用Mock数据
        if (config.useMockData) {
          const bill = {
            year,
            month,
            summary: {
              totalIncome: 1500.00,
              totalExpense: 800.00,
              netIncome: 700.00,
              transactionCount: 15
            },
            categoryStats: [
              { type: 'recharge', totalIncome: 1000.00, totalExpense: 0.00, count: 2 },
              { type: 'order_payment', totalIncome: 0.00, totalExpense: 500.00, count: 10 },
              { type: 'withdraw', totalIncome: 0.00, totalExpense: 300.00, count: 3 }
            ],
            dailyStats: [
              { date: '2026-02-01', income: 100.00, expense: 50.00, count: 2 },
              { date: '2026-02-05', income: 500.00, expense: 100.00, count: 3 },
              { date: '2026-02-10', income: 0.00, expense: 200.00, count: 5 },
              { date: '2026-02-15', income: 200.00, expense: 50.00, count: 2 },
              { date: '2026-02-20', income: 300.00, expense: 100.00, count: 3 },
              { date: '2026-02-25', income: 400.00, expense: 300.00, count: 5 }
            ],
            transactions: [
              {
                id: 'TXN_001',
                transactionType: 'recharge',
                amount: 500.00,
                description: '微信充值',
                createdAt: '2026-02-01 10:30:00'
              },
              {
                id: 'TXN_002',
                transactionType: 'order_payment',
                amount: -50.00,
                description: '账号租赁',
                createdAt: '2026-02-01 14:20:00'
              }
            ]
          };
          
          that.setData({
            bill
          });
        }
      });
  },

  /**
   * 切换月份
   */
  onMonthChange(e) {
    const index = e.detail.value;
    const monthList = this.data.monthList;
    const selectedMonth = monthList[index];
    
    this.setData({
      selectedMonthIndex: index,
      year: selectedMonth.year,
      month: selectedMonth.month
    });
    
    this.loadBill();
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 获取交易类型名称
   */
  getTransactionTypeName(type) {
    const typeMap = {
      'recharge': '充值',
      'withdraw': '提现',
      'order_payment': '订单支付',
      'order_refund': '订单退款',
      'income': '收入',
      'expense': '支出'
    };
    return typeMap[type] || type;
  },

  /**
   * 查看交易详情
   */
  onTransactionTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/wallet/transaction-detail/index?id=${id}`
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
