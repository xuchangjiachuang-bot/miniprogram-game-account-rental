// pages/wallet/withdraw-detail/index.js
const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');

Page({
  data: {
    id: '',
    withdrawal: null,
    statusSteps: [
      { key: 'pending', label: '待审核', icon: '⏳' },
      { key: 'approved', label: '已通过', icon: '✅' },
      { key: 'processing', label: '处理中', icon: '💸' },
      { key: 'completed', label: '已完成', icon: '🎉' },
      { key: 'rejected', label: '已拒绝', icon: '❌' },
      { key: 'cancelled', label: '已取消', icon: '🚫' }
    ]
  },

  onLoad(options) {
    console.log('提现详情页面加载', options);
    
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ id });
    this.loadWithdrawalDetail();
  },

  /**
   * 加载提现详情
   */
  loadWithdrawalDetail() {
    const that = this;
    const { id } = this.data;
    
    api.getWithdrawalDetail(id)
      .then(res => {
        const { data } = res;
        
        that.setData({
          withdrawal: data
        });
      })
      .catch(error => {
        console.error('加载提现详情失败:', error);
        
        // 使用Mock数据
        if (config.useMockData) {
          const withdrawal = {
            id: id,
            withdrawalNo: 'WD2026022600001',
            userId: 'user_001',
            username: '张三',
            amount: '100.00',
            withdrawalFee: '1.00',
            feeAmount: '1.00',
            actualAmount: '99.00',
            withdrawalType: 'wechat',
            accountInfo: {
              type: 'wechat',
              name: '张三',
              account: 'wx_abc123'
            },
            status: 'pending',
            createdAt: '2026-02-26 10:30:00',
            reviewTime: null,
            reviewRemark: null
          };
          
          that.setData({
            withdrawal
          });
        }
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
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待审核',
      'approved': '已通过',
      'processing': '处理中',
      'completed': '已完成',
      'rejected': '已拒绝',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  /**
   * 获取状态颜色
   */
  getStatusColor(status) {
    const colorMap = {
      'pending': '#ff9800',
      'approved': '#2196f3',
      'processing': '#9c27b0',
      'completed': '#4caf50',
      'rejected': '#f44336',
      'cancelled': '#9e9e9e'
    };
    return colorMap[status] || '#999';
  },

  /**
   * 获取提现方式文本
   */
  getWithdrawalTypeText(type) {
    const typeMap = {
      'wechat': '微信',
      'alipay': '支付宝',
      'bank': '银行卡'
    };
    return typeMap[type] || type;
  },

  /**
   * 复制提现单号
   */
  onCopyNo() {
    const { withdrawal } = this.data;
    if (!withdrawal) return;
    
    wx.setClipboardData({
      data: withdrawal.withdrawalNo,
      success() {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '确定要联系客服吗？',
      success(res) {
        if (res.confirm) {
          // TODO: 跳转到客服页面
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 刷新状态
   */
  onRefresh() {
    this.loadWithdrawalDetail();
    wx.stopPullDownRefresh();
  }
});
