const api = require('../../../../utils/api.js');
const dataTransformer = require('../../../../utils/data-transformer.js');
const navigation = require('../../../../utils/navigation.js');
const cloudFile = require('../../../../utils/cloud-file.js');

function formatMoney(value) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(2);
}

Page({
  data: {
    orderId: '',
    accountId: '',
    rentalHours: 0,
    accountInfo: null,
    totalPrice: '0.00',
    rentalPrice: '0.00',
    deposit: '0.00',
    paymentDescription: '请确认订单信息后发起微信支付。',
    loading: false,
  },

  onLoad(options) {
    const { orderId = '', accountId = '', rentalHours = 0 } = options || {};
    if (!orderId && !accountId) {
      wx.showToast({ title: '支付参数不完整', icon: 'none' });
      setTimeout(() => navigation.safeNavigateBack({
        fallbackUrl: '/pages/order/list/index',
        fallbackType: 'switchTab',
      }), 1200);
      return;
    }

    this.setData({
      orderId,
      accountId,
      rentalHours: Number(rentalHours || 0),
    });

    this.loadPaymentInfo();
  },

  loadPaymentInfo() {
    if (this.data.orderId) {
      return this.loadOrderDetail();
    }
    return this.loadAccountInfo();
  },

  loadOrderDetail() {
    return api.getOrderDetail(this.data.orderId)
      .then(async (res) => {
        const source = res?.data || {};
        const order = source.order || source;
        const account = dataTransformer.transformAccount(source.account || {}) || {
          id: order.accountId || order.account_id || this.data.accountId,
          fullTitle: order.accountName || order.account_name || '游戏账号',
          coins_display: order.coinsM ? `${order.coinsM}M` : '-',
          images: [order.accountImage || order.account_image || '/images/default-account.png'],
        };
        const images = await cloudFile.resolveImageList(
          Array.isArray(account.images) ? account.images : [order.accountImage || order.account_image]
        );

        this.setData({
          orderId: order.id || this.data.orderId,
          accountId: account.id || this.data.accountId,
          rentalHours: Number(order.rentalDuration || order.rent_hours || this.data.rentalHours || 0),
          accountInfo: {
            id: account.id,
            title: account.fullTitle || account.title || '游戏账号',
            image: (images && images[0]) || '/images/default-account.png',
            coins: account.coins_display || '-',
          },
          rentalPrice: formatMoney(order.rentalPrice || order.rent_amount || 0),
          deposit: formatMoney(order.deposit || order.deposit_amount || 0),
          totalPrice: formatMoney(order.totalPrice || order.total_price || 0),
        });
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '加载订单失败', icon: 'none' });
      });
  },

  loadAccountInfo() {
    const { accountId, rentalHours } = this.data;

    return api.getAccountDetail(accountId)
      .then(async (res) => {
        const account = dataTransformer.transformAccount(res?.data) || {};
        const dailyRental = Number(account.actual_rental || 0);
        const rentalPrice = rentalHours > 0 ? (dailyRental * (rentalHours / 24)) : dailyRental;
        const deposit = Number(account.deposit || 0);
        const images = await cloudFile.resolveImageList(account.images || []);

        this.setData({
          accountInfo: {
            id: account.id || accountId,
            title: account.fullTitle || account.title || '游戏账号',
            image: (images && images[0]) || '/images/default-account.png',
            coins: account.coins_display || '-',
          },
          rentalPrice: formatMoney(rentalPrice),
          deposit: formatMoney(deposit),
          totalPrice: formatMoney(rentalPrice + deposit),
        });
      })
      .catch((error) => {
        wx.showToast({ title: error.error || '加载账号信息失败', icon: 'none' });
      });
  },

  onPayment() {
    const { loading, orderId, accountId, rentalHours } = this.data;
    if (loading) {
      return;
    }
    if (!orderId) {
      wx.showToast({ title: '缺少订单编号，无法发起支付', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    api.createMinipPayment({
      orderId,
      accountId,
      rentalHours: Number(rentalHours || 0),
    })
      .then((res) => {
        const data = res?.data || {};
        const paymentArgs = {
          timeStamp: data.timeStamp,
          nonceStr: data.nonceStr,
          package: data.package,
          signType: data.signType,
          paySign: data.paySign,
        };

        wx.requestPayment({
          ...paymentArgs,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(() => {
              wx.redirectTo({ url: `/pages/order/detail/index?id=${orderId}` });
            }, 1000);
          },
          fail: (error) => {
            console.error('微信支付失败:', error);
            this.setData({ loading: false });
            const canceled = (error.errMsg || '').includes('cancel');
            wx.showToast({
              title: canceled ? '已取消支付' : '支付失败，请重试',
              icon: 'none',
            });
          },
        });
      })
      .catch((error) => {
        console.error('创建微信支付订单失败:', error);
        this.setData({ loading: false });
        wx.showToast({ title: error.error || '拉起支付失败', icon: 'none' });
      });
  },

  onCancel() {
    wx.showModal({
      title: '确认暂不支付',
      content: '返回后可在订单详情中继续完成支付。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        navigation.safeNavigateBack({
          fallbackUrl: this.data.orderId
            ? `/pages/order/detail/index?id=${this.data.orderId}`
            : '/pages/order/list/index',
          fallbackType: this.data.orderId ? 'redirectTo' : 'switchTab',
        });
      },
    });
  },
});
