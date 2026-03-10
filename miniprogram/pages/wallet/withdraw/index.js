// pages/wallet/withdraw/index.js
const api = require('../../../utils/api.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    wallet: {
      availableBalance: '0.00',
      frozenBalance: '0.00'
    },
    accounts: [],
    selectedAccountId: null,
    withdrawAmount: '',
    config: {
      minAmount: 1,
      maxAmount: 50000,
      monthlyLimit: 5,
      feeRate: 0.001 // 0.1% 手续费
    },
    fee: 0,
    actualAmount: 0,
    withdrawing: false
  },

  onLoad(options) {
    console.log('钱包提现页面加载');
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    Promise.all([
      this.loadWalletInfo(),
      this.loadAccounts()
    ]).catch(error => {
      console.error('加载数据失败:', error);
    });
  },

  /**
   * 加载钱包信息
   */
  loadWalletInfo() {
    const that = this;
    
    return api.getWalletInfo()
      .then(res => {
        that.setData({
          wallet: {
            availableBalance: that.formatMoney(res.data.availableBalance),
            frozenBalance: that.formatMoney(res.data.frozenBalance)
          }
        });
      });
  },

  /**
   * 加载提现账户
   */
  loadAccounts() {
    const that = this;
    
    return api.getWithdrawAccounts()
      .then(res => {
        const accounts = res.data.list || [];
        
        that.setData({
          accounts,
          selectedAccountId: accounts.length > 0 ? accounts[0].id : null
        });
      });
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 金额输入
   */
  onAmountInput(e) {
    const value = parseFloat(e.detail.value) || 0;
    
    this.setData({
      withdrawAmount: e.detail.value,
      fee: this.calculateFee(value),
      actualAmount: this.calculateActualAmount(value)
    });
  },

  /**
   * 计算手续费
   */
  calculateFee(amount) {
    const feeRate = this.data.config.feeRate;
    const fee = amount * feeRate;
    return parseFloat(fee.toFixed(2));
  },

  /**
   * 计算实际到账金额
   */
  calculateActualAmount(amount) {
    const fee = this.data.fee;
    return Math.max(0, amount - fee);
  },

  /**
   * 全部提现
   */
  onWithdrawAll() {
    const availableBalance = parseFloat(this.data.wallet.availableBalance);
    
    this.setData({
      withdrawAmount: availableBalance.toString(),
      fee: this.calculateFee(availableBalance),
      actualAmount: this.calculateActualAmount(availableBalance)
    });
  },

  /**
   * 选择账户
   */
  onAccountTap(e) {
    this.setData({
      selectedAccountId: e.currentTarget.dataset.id
    });
  },

  /**
   * 添加提现账户
   */
  onAddAccount() {
    wx.navigateTo({
      url: '/pages/wallet/add-account/index'
    });
  },

  /**
   * 是否可以提现
   */
  get canWithdraw() {
    const { withdrawAmount, wallet, config, selectedAccountId } = this.data;
    const amount = parseFloat(withdrawAmount);
    const availableBalance = parseFloat(wallet.availableBalance);
    
    return (
      amount > 0 &&
      amount >= config.minAmount &&
      amount <= config.maxAmount &&
      amount <= availableBalance &&
      selectedAccountId
    );
  },

  /**
   * 确认提现
   */
  onWithdraw() {
    const that = this;
    
    if (!that.data.canWithdraw) {
      return;
    }
    
    const { withdrawAmount, selectedAccountId, config } = that.data;
    const amount = parseFloat(withdrawAmount);
    const availableBalance = parseFloat(that.data.wallet.availableBalance);
    
    // 验证金额
    if (amount < config.minAmount) {
      wx.showToast({
        title: `最低提现金额为${config.minAmount}元`,
        icon: 'none'
      });
      return;
    }
    
    if (amount > config.maxAmount) {
      wx.showToast({
        title: `单笔提现不能超过${config.maxAmount}元`,
        icon: 'none'
      });
      return;
    }
    
    if (amount > availableBalance) {
      wx.showToast({
        title: '余额不足',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认提现',
      content: `提现金额：¥${withdrawAmount}\n手续费：¥${that.data.fee}\n实际到账：¥${that.data.actualAmount}\n\n确认提现到：${that.getAccountName()}`,
      success(res) {
        if (res.confirm) {
          that.submitWithdraw();
        }
      }
    });
  },

  /**
   * 获取账户名称
   */
  getAccountName() {
    const { accounts, selectedAccountId } = this.data;
    const account = accounts.find(a => a.id === selectedAccountId);
    return account ? `${account.bankName} ${account.accountNumber}` : '';
  },

  /**
   * 提交提现申请
   */
  submitWithdraw() {
    const that = this;
    
    that.setData({ withdrawing: true });
    
    api.createWithdrawal({
      amount: parseFloat(that.data.withdrawAmount),
      accountId: that.data.selectedAccountId
    })
    .then(res => {
      that.setData({ withdrawing: false });
      
      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      });
      
      // 跳转到提现详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/wallet/withdraw-detail/index?id=${res.data.id}`
        });
      }, 1500);
    })
    .catch(error => {
      console.error('提现失败:', error);
      that.setData({ withdrawing: false });
      
      wx.showToast({
        title: error.error || '提现失败',
        icon: 'none'
      });
    });
  }
});
