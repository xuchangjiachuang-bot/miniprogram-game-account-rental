const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');
const navigation = require('../../../utils/navigation.js');

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function buildMonthLabel(year, month) {
  return year + '年' + month + '月账单';
}

function getCategoryName(type) {
  const typeMap = {
    recharge: '余额充值',
    withdraw: '提现申请',
    order_payment: '账号租赁支出',
    order_refund: '订单退款',
    income: '收入到账',
    expense: '余额支出',
  };
  return typeMap[type] || type || '其他';
}

function normalizeBill(data, year, month) {
  const source = data || {};
  const summary = source.summary || {};
  const categoryStats = Array.isArray(source.categoryStats) ? source.categoryStats : [];
  const dailyStats = Array.isArray(source.dailyStats) ? source.dailyStats : [];
  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  const maxDaily = dailyStats.reduce((max, item) => {
    return Math.max(max, Number(item.income || 0), Number(item.expense || 0));
  }, 0) || 1;

  return {
    year,
    month,
    summary: {
      totalIncome: formatMoney(summary.totalIncome),
      totalExpense: formatMoney(summary.totalExpense),
      netIncome: formatMoney(summary.netIncome),
      netIncomeValue: Number(summary.netIncome || 0),
      transactionCount: Number(summary.transactionCount || 0),
    },
    categoryStats: categoryStats.map((item) => {
      const income = Number(item.totalIncome || 0);
      const expense = Number(item.totalExpense || 0);
      const isIncome = income > 0;
      const displayAmount = isIncome ? income : expense;
      return {
        name: getCategoryName(item.type),
        count: Number(item.count || 0),
        amountText: (isIncome ? '+' : '-') + '¥' + formatMoney(displayAmount),
        amountClass: isIncome ? 'income' : 'expense',
      };
    }),
    dailyStats: dailyStats.map((item) => ({
      dateLabel: String(item.date || '').slice(5),
      incomeDisplay: formatMoney(item.income),
      expenseDisplay: formatMoney(item.expense),
      incomeWidth: Math.max(8, Math.round((Number(item.income || 0) / maxDaily) * 100)),
      expenseWidth: Math.max(8, Math.round((Number(item.expense || 0) / maxDaily) * 100)),
    })),
    transactions: transactions.map((item) => {
      const amount = Number(item.amount || 0);
      return {
        id: item.id,
        transactionTypeName: getCategoryName(item.transactionType || item.transaction_type),
        description: item.description || getCategoryName(item.transactionType || item.transaction_type),
        createdAt: item.createdAt || '',
        amountText: (amount >= 0 ? '+' : '-') + '¥' + formatMoney(Math.abs(amount)),
        amountClass: amount >= 0 ? 'income' : 'expense',
      };
    }),
  };
}

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    bill: null,
    monthList: [],
    selectedMonthIndex: 0,
    selectedMonthLabel: '',
    loading: false,
    errorText: '',
  },

  onLoad(options) {
    const year = Number(options.year || this.data.year);
    const month = Number(options.month || this.data.month);

    this.setData({ year, month });
    this.initMonthList();
    this.loadBill();
  },

  initMonthList() {
    const current = new Date(this.data.year, this.data.month - 1, 1);
    const monthList = [];

    for (let i = 0; i < 12; i += 1) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      monthList.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: buildMonthLabel(date.getFullYear(), date.getMonth() + 1),
      });
    }

    const selectedMonthIndex = monthList.findIndex((item) => item.year === this.data.year && item.month === this.data.month);
    const finalIndex = selectedMonthIndex >= 0 ? selectedMonthIndex : 0;

    this.setData({
      monthList,
      selectedMonthIndex: finalIndex,
      selectedMonthLabel: monthList[finalIndex].label,
      year: monthList[finalIndex].year,
      month: monthList[finalIndex].month,
    });
  },

  loadBill() {
    const year = this.data.year;
    const month = this.data.month;
    this.setData({ loading: true, errorText: '' });

    return api.getMonthlyBill(year, month)
      .then((res) => {
        this.setData({
          bill: normalizeBill(res && res.data ? res.data : null, year, month),
        });
      })
      .catch((error) => {
        console.error('加载账单失败:', error);
        if (config.useMockData) {
          this.setData({
            bill: normalizeBill({
              summary: {
                totalIncome: 1500,
                totalExpense: 800,
                netIncome: 700,
                transactionCount: 15,
              },
              categoryStats: [
                { type: 'recharge', totalIncome: 1000, totalExpense: 0, count: 2 },
                { type: 'order_payment', totalIncome: 0, totalExpense: 500, count: 10 },
                { type: 'withdraw', totalIncome: 0, totalExpense: 300, count: 3 },
              ],
              dailyStats: [
                { date: '2026-04-01', income: 100, expense: 50 },
                { date: '2026-04-05', income: 500, expense: 100 },
                { date: '2026-04-10', income: 0, expense: 200 },
              ],
              transactions: [
                {
                  id: 'TXN_001',
                  transactionType: 'recharge',
                  amount: 500,
                  description: '微信充值',
                  createdAt: '2026-04-01 10:30:00',
                },
                {
                  id: 'TXN_002',
                  transactionType: 'order_payment',
                  amount: -50,
                  description: '账号租赁支付',
                  createdAt: '2026-04-01 14:20:00',
                },
              ],
            }, year, month),
          });
          return;
        }
        this.setData({
          bill: null,
          errorText: error.error || '账单加载失败，请稍后重试',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onMonthChange(e) {
    const index = Number(e.detail.value || 0);
    const selectedMonth = this.data.monthList[index];
    if (!selectedMonth) return;

    this.setData({
      selectedMonthIndex: index,
      selectedMonthLabel: selectedMonth.label,
      year: selectedMonth.year,
      month: selectedMonth.month,
    });

    this.loadBill();
  },

  onTransactionTap() {
    wx.showToast({
      title: '小程序端明细页整理中',
      icon: 'none',
    });
  },

  onBack() {
    navigation.safeNavigateBack({
      fallbackUrl: '/pages/wallet/index',
      fallbackType: 'redirectTo',
    });
  },

  onRetry() {
    this.loadBill();
  },
});
