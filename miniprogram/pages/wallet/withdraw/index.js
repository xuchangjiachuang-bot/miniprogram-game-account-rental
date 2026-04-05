const api = require('../../../utils/api.js');

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

Page({
  data: {
    wallet: {
      availableBalance: '0.00',
      frozenBalance: '0.00',
    },
    accounts: [],
    selectedAccountId: null,
    withdrawAmount: '',
    config: {
      minAmount: 1,
      maxAmount: 50000,
      monthlyLimit: 5,
      feeRate: 0.001,
    },
    fee: '0.00',
    actualAmount: '0.00',
    canWithdraw: false,
    withdrawing: false,
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    return Promise.allSettled([
      this.loadWalletInfo(),
      this.loadAccounts(),
    ]).then(() => {
      this.updateWithdrawState(this.data.withdrawAmount);
    });
  },

  loadWalletInfo() {
    return api.getWalletInfo().then((res) => {
      const data = res && res.data ? res.data : {};
      this.setData({
        wallet: {
          availableBalance: formatMoney(data.availableBalance || data.available_balance || data.balance || 0),
          frozenBalance: formatMoney(data.frozenBalance || data.frozen_balance || 0),
        },
      });
    });
  },

  loadAccounts() {
    return api.getWithdrawAccounts().then((res) => {
      const accounts = (res && res.data && Array.isArray(res.data.list)) ? res.data.list : [];
      const normalized = accounts.map((item) => ({
        id: item.id,
        bankName: item.bankName || '微信零钱',
        accountNumber: item.accountNumber || '已授权微信账号',
        shortName: String((item.bankName || '微')).slice(0, 1),
      }));
      this.setData({
        accounts: normalized,
        selectedAccountId: normalized.length ? (this.data.selectedAccountId || normalized[0].id) : null,
      });
    });
  },

  calculateFee(amount) {
    const fee = Number(amount || 0) * Number(this.data.config.feeRate || 0);
    return Number(fee.toFixed(2));
  },

  updateWithdrawState(rawValue) {
    const amount = Number(rawValue || 0);
    const fee = this.calculateFee(amount);
    const actualAmount = Math.max(0, amount - fee);
    const availableBalance = Number(this.data.wallet.availableBalance || 0);
    const canWithdraw = Boolean(
      amount >= Number(this.data.config.minAmount || 0)
      && amount <= Number(this.data.config.maxAmount || 0)
      && amount <= availableBalance
      && this.data.selectedAccountId
    );

    this.setData({
      withdrawAmount: rawValue,
      fee: formatMoney(fee),
      actualAmount: formatMoney(actualAmount),
      canWithdraw,
    });
  },

  onAmountInput(e) {
    this.updateWithdrawState(e.detail.value);
  },

  onWithdrawAll() {
    this.updateWithdrawState(formatMoney(this.data.wallet.availableBalance));
  },

  onAccountTap(e) {
    this.setData({
      selectedAccountId: e.currentTarget.dataset.id,
    });
    this.updateWithdrawState(this.data.withdrawAmount);
  },

  onAddAccount() {
    wx.showToast({
      title: '当前版本先使用默认微信零钱提现',
      icon: 'none',
    });
  },

  getSelectedAccountName() {
    const account = this.data.accounts.find((item) => item.id === this.data.selectedAccountId);
    return account ? (account.bankName + ' ' + account.accountNumber) : '未选择账户';
  },

  onWithdraw() {
    const amount = Number(this.data.withdrawAmount || 0);
    const availableBalance = Number(this.data.wallet.availableBalance || 0);

    if (!this.data.canWithdraw) {
      if (amount < Number(this.data.config.minAmount || 0)) {
        wx.showToast({ title: '提现金额低于最低限制', icon: 'none' });
        return;
      }
      if (amount > Number(this.data.config.maxAmount || 0)) {
        wx.showToast({ title: '提现金额超过单笔上限', icon: 'none' });
        return;
      }
      if (amount > availableBalance) {
        wx.showToast({ title: '可提现余额不足', icon: 'none' });
        return;
      }
      wx.showToast({ title: '请先选择提现账户', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认提现',
      content: '提现金额：¥' + formatMoney(amount)
        + '\n手续费：¥' + this.data.fee
        + '\n实际到账：¥' + this.data.actualAmount
        + '\n到账账户：' + this.getSelectedAccountName(),
      success: (res) => {
        if (res.confirm) {
          this.submitWithdraw();
        }
      },
    });
  },

  submitWithdraw() {
    this.setData({ withdrawing: true });

    api.createWithdrawal({
      amount: Number(this.data.withdrawAmount || 0),
      accountId: this.data.selectedAccountId,
    })
      .then((res) => {
        const withdrawalId = res && res.data ? res.data.id : '';
        this.setData({ withdrawing: false });
        wx.showToast({ title: '提现申请已提交', icon: 'success' });
        setTimeout(() => {
          if (withdrawalId) {
            wx.redirectTo({
              url: '/pages/wallet/withdraw-detail/index?id=' + withdrawalId,
            });
            return;
          }
          navigation.safeNavigateBack({
            fallbackUrl: '/pages/wallet/index',
            fallbackType: 'redirectTo',
          });
        }, 1200);
      })
      .catch((error) => {
        console.error('提现失败:', error);
        this.setData({ withdrawing: false });
        wx.showToast({
          title: error && error.error ? error.error : '提现失败，请稍后再试',
          icon: 'none',
        });
      });
  },
});
