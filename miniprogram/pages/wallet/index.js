const api = require('../../utils/api.js');
const config = require('../../utils/config.js');

const PERIOD_LIST = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' },
];

const MOCK_WALLET = {
  balance: 520.0,
  totalRecharge: 1000.0,
  totalWithdraw: 480.0,
  availableBalance: 520.0,
};

const MOCK_STATISTICS = {
  summary: {
    totalIncome: 500.0,
    totalExpense: 200.0,
    netIncome: 300.0,
  },
  dailyStats: [
    { date: '2026-04-01', income: 120.0, expense: 20.0 },
    { date: '2026-04-02', income: 80.0, expense: 60.0 },
    { date: '2026-04-03', income: 180.0, expense: 40.0 },
    { date: '2026-04-04', income: 120.0, expense: 80.0 },
  ],
};

const MOCK_TRANSACTIONS = [
  {
    id: 'TXN_001',
    transactionType: 'order_payment',
    amount: -10.0,
    title: '账号租赁支付',
    createdAt: '2026-04-04 14:20:00',
  },
  {
    id: 'TXN_002',
    transactionType: 'recharge',
    amount: 100.0,
    title: '微信充值',
    createdAt: '2026-04-03 09:30:00',
  },
];

function formatMoney(amount) {
  const value = Number(amount || 0);
  return value.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return month + '-' + day + ' ' + hour + ':' + minute;
}

function mapTransactionTitle(type, fallback) {
  const typeMap = {
    recharge: '余额充值',
    withdraw: '提现申请',
    order_payment: '账号租赁支付',
    order_refund: '订单退款',
    income: '收入到账',
    expense: '支出扣款',
  };
  return fallback || typeMap[type] || '余额变动';
}

function mapTransactionIcon(type) {
  const iconMap = {
    recharge: '/images/icons/recharge.png',
    withdraw: '/images/icons/withdraw.png',
    order_payment: '/images/icons/order.png',
    order_refund: '/images/icons/refund.png',
    income: '/images/icons/income.png',
    expense: '/images/icons/expense.png',
  };
  return iconMap[type] || '/images/icons/default.png';
}

function normalizeStatistics(data) {
  const source = data || MOCK_STATISTICS;
  const summary = source.summary || {};
  const dailyStats = Array.isArray(source.dailyStats) ? source.dailyStats : [];
  const maxAmount = dailyStats.reduce((max, item) => {
    return Math.max(max, Number(item.income || 0), Number(item.expense || 0));
  }, 0) || 1;

  return {
    summary: {
      totalIncome: formatMoney(summary.totalIncome),
      totalExpense: formatMoney(summary.totalExpense),
      netIncome: formatMoney(summary.netIncome),
      netIncomeValue: Number(summary.netIncome || 0),
    },
    dailyStats: dailyStats.map((item) => ({
      date: item.date,
      label: String(item.date || '').slice(5),
      incomeDisplay: formatMoney(item.income),
      expenseDisplay: formatMoney(item.expense),
      incomeHeight: Math.max(8, Math.round((Number(item.income || 0) / maxAmount) * 100)),
      expenseHeight: Math.max(8, Math.round((Number(item.expense || 0) / maxAmount) * 100)),
    })),
  };
}

function normalizeTransactions(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const rawType = item.transaction_type || item.transactionType || item.type;
    const amount = Number(item.amount || 0);
    const isIncome = amount >= 0;
    return {
      id: item.id,
      icon: mapTransactionIcon(rawType),
      title: mapTransactionTitle(rawType, item.title || item.description),
      createdAtText: formatDateTime(item.createdAt || item.createTime),
      amountText: (isIncome ? '+' : '-') + '¥' + formatMoney(Math.abs(amount)),
      amountClass: isIncome ? 'income' : 'expense',
    };
  });
}

Page({
  data: {
    wallet: {
      balance: '0.00',
      totalRecharge: '0.00',
      totalWithdraw: '0.00',
      availableBalance: '0.00',
    },
    statistics: normalizeStatistics(MOCK_STATISTICS),
    periodList: PERIOD_LIST,
    currentPeriodIndex: 1,
    transactions: [],
  },

  onLoad() {
    this.refreshPage();
  },

  onShow() {
    this.refreshPage();
  },

  onPullDownRefresh() {
    this.refreshPage().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshPage() {
    return Promise.allSettled([
      this.loadWalletInfo(),
      this.loadStatistics(),
      this.loadTransactions(),
    ]);
  },

  loadWalletInfo() {
    return api.getWalletInfo()
      .then((res) => {
        const data = res && res.data ? res.data : {};
        const availableBalance = data.available_balance ?? data.availableBalance ?? data.balance ?? 0;
        const totalRecharged = data.total_recharged ?? data.totalRecharge ?? data.totalEarned ?? 0;
        const totalWithdrawn = data.total_withdrawn ?? data.totalWithdraw ?? data.totalWithdrawn ?? 0;

        this.setData({
          wallet: {
            balance: formatMoney(availableBalance),
            totalRecharge: formatMoney(totalRecharged),
            totalWithdraw: formatMoney(totalWithdrawn),
            availableBalance: formatMoney(availableBalance),
          },
        });
      })
      .catch((error) => {
        console.error('加载钱包信息失败:', error);
        if (config.useMockData) {
          this.setData({
            wallet: {
              balance: formatMoney(MOCK_WALLET.balance),
              totalRecharge: formatMoney(MOCK_WALLET.totalRecharge),
              totalWithdraw: formatMoney(MOCK_WALLET.totalWithdraw),
              availableBalance: formatMoney(MOCK_WALLET.availableBalance),
            },
          });
        }
      });
  },

  loadStatistics() {
    const currentPeriod = this.data.periodList[this.data.currentPeriodIndex].value;
    return api.getWalletStatistics(currentPeriod)
      .then((res) => {
        this.setData({
          statistics: normalizeStatistics(res && res.data ? res.data : null),
        });
      })
      .catch((error) => {
        console.error('加载钱包统计失败:', error);
        if (config.useMockData) {
          this.setData({
            statistics: normalizeStatistics(MOCK_STATISTICS),
          });
        }
      });
  },

  loadTransactions() {
    return api.getTransactions({ limit: 10 })
      .then((res) => {
        const list = res && res.data ? (res.data.list || []) : [];
        this.setData({
          transactions: normalizeTransactions(list),
        });
      })
      .catch((error) => {
        console.error('加载交易记录失败:', error);
        if (config.useMockData) {
          this.setData({
            transactions: normalizeTransactions(MOCK_TRANSACTIONS),
          });
        }
      });
  },

  onPeriodChange(e) {
    const index = Number(e.detail.value || 0);
    this.setData({
      currentPeriodIndex: index,
    });
    this.loadStatistics();
  },

  onMonthlyBillTap() {
    const now = new Date();
    wx.navigateTo({
      url: '/pages/wallet/bill/index?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1),
    });
  },

  onRechargeTap() {
    wx.navigateTo({
      url: '/pages/wallet/recharge/index',
    });
  },

  onWithdrawTap() {
    wx.navigateTo({
      url: '/pages/wallet/withdraw/index',
    });
  },

  onTransactionsTap() {
    wx.navigateTo({
      url: '/pages/wallet/bill/index',
    });
  },

  onStatisticsTap() {
    wx.showToast({
      title: '更多统计能力整理中',
      icon: 'none',
    });
  },

  onTransactionTap() {
    wx.showToast({
      title: '请在月度账单中查看完整明细',
      icon: 'none',
    });
  },
});
