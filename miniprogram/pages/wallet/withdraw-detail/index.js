const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');
const navigation = require('../../../utils/navigation.js');

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function getStatusMeta(status) {
  const meta = {
    pending: { text: '待审核', color: '#f59e0b', icon: '审' },
    approved: { text: '已通过', color: '#3b82f6', icon: '过' },
    processing: { text: '处理中', color: '#0f766e', icon: '中' },
    completed: { text: '提现成功', color: '#16a34a', icon: '成' },
    rejected: { text: '已拒绝', color: '#dc2626', icon: '拒' },
    cancelled: { text: '已取消', color: '#6b7280', icon: '停' },
  };
  return meta[status] || { text: '处理中', color: '#6b7280', icon: '查' };
}

function getWithdrawalTypeText(type) {
  const typeMap = {
    wechat: '微信零钱',
    alipay: '支付宝',
    bank: '银行卡',
  };
  return typeMap[type] || '提现账户';
}

function buildTimeline(detail) {
  const status = detail.status;
  const reviewTime = detail.reviewTime || '待处理';
  return [
    {
      key: 'submit',
      title: '提交申请',
      time: detail.createdAt || '刚刚',
      active: true,
      rejected: false,
    },
    {
      key: 'review',
      title: status === 'rejected' ? '审核未通过' : '审核完成',
      time: ['approved', 'processing', 'completed', 'rejected'].includes(status) ? reviewTime : '待审核',
      active: ['approved', 'processing', 'completed', 'rejected'].includes(status),
      rejected: status === 'rejected',
    },
    {
      key: 'pay',
      title: '打款处理中',
      time: ['processing', 'completed'].includes(status) ? reviewTime : '待处理',
      active: ['processing', 'completed'].includes(status),
      rejected: false,
    },
    {
      key: 'done',
      title: '提现成功',
      time: status === 'completed' ? reviewTime : '待完成',
      active: status === 'completed',
      rejected: false,
    },
  ];
}

function normalizeWithdrawal(raw, id) {
  const source = raw || {};
  const statusMeta = getStatusMeta(source.status || 'pending');
  const accountInfo = source.accountInfo || {};
  const amount = Number(source.amount || 0);
  const feeAmount = Number(source.feeAmount || source.withdrawalFee || 0);
  const actualAmount = Number(source.actualAmount || amount - feeAmount || 0);

  const detail = {
    id: source.id || id,
    withdrawalNo: source.withdrawalNo || id,
    status: source.status || 'pending',
    statusText: statusMeta.text,
    statusColor: statusMeta.color,
    statusIcon: statusMeta.icon,
    amountText: formatMoney(amount),
    feeText: formatMoney(feeAmount),
    actualAmountText: formatMoney(actualAmount),
    withdrawalTypeText: getWithdrawalTypeText(source.withdrawalType),
    accountName: accountInfo.name || '默认账户',
    accountNumber: accountInfo.account || accountInfo.accountNumber || '已授权微信账户',
    createdAt: source.createdAt || '刚刚',
    reviewTime: source.reviewTime || '',
    reviewRemark: source.reviewRemark || '',
  };

  detail.timeline = buildTimeline({
    status: detail.status,
    createdAt: detail.createdAt,
    reviewTime: detail.reviewTime,
  });
  return detail;
}

Page({
  data: {
    id: '',
    withdrawal: null,
  },

  onLoad(options) {
    const id = options.id || '';
    if (!id) {
      wx.showToast({ title: '缺少提现单号', icon: 'none' });
      setTimeout(() => navigation.safeNavigateBack({
        fallbackUrl: '/pages/wallet/index',
        fallbackType: 'redirectTo',
      }), 1200);
      return;
    }
    this.setData({ id });
    this.loadWithdrawalDetail();
  },

  loadWithdrawalDetail() {
    return api.getWithdrawalDetail(this.data.id)
      .then((res) => {
        const raw = res && res.data ? res.data : null;
        this.setData({
          withdrawal: normalizeWithdrawal(raw, this.data.id),
        });
      })
      .catch((error) => {
        console.error('加载提现详情失败:', error);
        if (config.useMockData) {
          this.setData({
            withdrawal: normalizeWithdrawal({
              id: this.data.id,
              withdrawalNo: 'WD202604040001',
              amount: 100,
              feeAmount: 1,
              actualAmount: 99,
              withdrawalType: 'wechat',
              accountInfo: {
                name: '张三',
                account: '138****8888',
              },
              status: 'pending',
              createdAt: '2026-04-04 10:30:00',
            }, this.data.id),
          });
        }
      });
  },

  onCopyNo() {
    if (!this.data.withdrawal) return;
    wx.setClipboardData({
      data: this.data.withdrawal.withdrawalNo,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },

  onContactService() {
    wx.showToast({
      title: '客服入口整理中，请先在消息页联系平台',
      icon: 'none',
    });
  },

  onRefresh() {
    this.loadWithdrawalDetail();
  },

  onBack() {
    navigation.safeNavigateBack({
      fallbackUrl: '/pages/wallet/index',
      fallbackType: 'redirectTo',
    });
  },
});
