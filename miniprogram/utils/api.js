const request = require('./request.js');

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.list)) return value.list;
  if (Array.isArray(value?.orders)) return value.orders;
  if (Array.isArray(value?.accounts)) return value.accounts;
  if (Array.isArray(value?.withdrawals)) return value.withdrawals;
  return [];
};

const firstDefined = (...values) => values.find((item) => item !== undefined && item !== null);

const normalizeWallet = (wallet) => {
  const availableBalance = firstDefined(wallet?.availableBalance, wallet?.available_balance, 0);
  const frozenBalance = firstDefined(wallet?.frozenBalance, wallet?.frozen_balance, 0);
  return {
    ...(wallet || {}),
    availableBalance,
    available_balance: availableBalance,
    frozenBalance,
    frozen_balance: frozenBalance,
  };
};

const buildOrderAccount = (order) => ({
  id: order?.accountId || order?.account_id || '',
  title: order?.accountName || order?.account_name || '游戏账号',
  avatar: order?.accountImage || order?.account_image || '/images/default-account.png',
  skinName: order?.skinName || '',
  duration: order?.rentalDuration || order?.rent_hours || '-',
  coinsM: Number(order?.coinsM || order?.coins_million || 0),
  safeboxCount: Number(order?.safeboxCount || order?.safebox_count || 0),
  staminaValue: Number(order?.staminaValue || order?.stamina_value || 0),
  energyValue: Number(order?.energyValue || order?.energy_value || 0),
  tags: Array.isArray(order?.tags) ? order.tags : [],
  customAttributes: order?.customAttributes || {},
  gameAccount: order?.gameAccount || order?.username || '',
  gamePassword: order?.gamePassword || order?.password || '',
  gameVerify: order?.gameVerify || order?.verifyCode || '',
});

const miniprogramLogin = (payload) => {
  const normalizedPayload = typeof payload === 'string' ? { code: payload } : (payload || {});
  return request.post('/auth/miniprogram', normalizedPayload);
};

const bindPhone = (data) => request.post('/auth/miniprogram/bind-phone', data || {});
const manualBindPhone = (data) => request.put('/auth/profile', { phone: data?.phone || '' });

const sendSmsCode = (phone) => {
  const normalizedPhone = typeof phone === 'string' ? phone : phone?.phone;
  return request.post('/sms/send', { phone: normalizedPhone });
};

const phoneLogin = () => Promise.reject({
  success: false,
  error: '手机号登录暂未启用，请先使用微信登录。',
});

const getUserInfo = () => request.get('/auth/me');
const updateUserInfo = (data) => request.put('/auth/profile', data || {});

const verifyRealName = (data) => request.post('/verification/initiate', data || {});
const submitRealNameVerify = (data) => request.post('/verification/initiate', data || {});
const getVerifyResult = () => request.get('/verification/result');
const getVerifyHistory = () => request.get('/verification/history');

const getAccounts = (params) => request.get('/accounts', params || {}).then((res) => {
  const list = toArray(res?.data);
  return {
    ...res,
    data: {
      ...(res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : {}),
      list,
      accounts: list,
    },
  };
});

const getAccountDetail = (id) => request.get('/accounts/' + id);
const createAccount = (data) => request.post('/accounts', data || {});
const updateAccount = (id, data) => request.put('/accounts/' + id, data || {});
const uploadAccountImage = (filePath) => request.upload('/upload/image', filePath);
const uploadFile = (filePath) => request.upload('/upload/image', filePath);
const uploadImage = (filePath) => request.upload('/upload/image', filePath);

const createOrder = (data) => request.post('/orders', data || {});

const getOrders = (params) => request.get('/orders', params || {}).then((res) => {
  const data = res?.data || {};
  const list = toArray(data);
  return {
    ...res,
    data: {
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
      list,
      orders: list,
      counts: data?.counts || {},
    },
  };
});

const getOrderDetail = (id) => request.get('/orders/' + id).then((res) => {
  const order = res?.data || {};
  return {
    ...res,
    data: {
      ...(order && typeof order === 'object' ? order : {}),
      order,
      account: buildOrderAccount(order),
    },
  };
});

const verifyOrder = (id, data) => request.post('/orders/' + id + '/verify', data || {});
const completeOrder = (id) => request.post('/orders/' + id, { action: 'complete' });
const cancelOrder = (id) => request.post('/orders/' + id, { action: 'cancel' });
const balancePay = (id) => request.post('/orders/' + id, { action: 'pay' });
const requestRefund = (id, reason) => request.post('/orders/' + id + '/refund', { reason });
const rateOrder = (id, data) => request.post('/orders/' + id + '/rate', data || {});

const createMiniprogramPayment = (orderId) => request.post('/payment/wechat/minip/create', { orderId });
const createMinipPayment = (data) => request.post('/payment/wechat/minip/create', data || {});
const wechatPay = (orderId) => request.post('/payment/wechat/minip/create', { orderId });
const queryPaymentStatus = (orderId) => request.get('/payment/status/' + orderId);

const getBalance = () => request.get('/balance');

const getWalletInfo = () => request.get('/wallet').then((res) => ({
  ...res,
  data: normalizeWallet(res?.data),
}));

const getWalletStatistics = (period) => request.get('/wallet/statistics', { period });

const getTransactions = (params) => request.get('/wallet/transactions', {
  page: params?.page || 1,
  pageSize: params?.limit || params?.pageSize || 20,
});

const getMonthlyBill = (year, month) => request.get('/wallet/bills', { year, month });

const getUserStats = async () => {
  const [ordersRes, walletRes] = await Promise.all([
    getOrders(),
    getWalletInfo(),
  ]);

  const orders = toArray(ordersRes?.data);
  const wallet = normalizeWallet(walletRes?.data || {});

  return {
    success: true,
    data: {
      orderCount: orders.length || 0,
      collectCount: 0,
      balance: Number(firstDefined(wallet.available_balance, wallet.availableBalance, 0) || 0),
      creditScore: 0,
    },
  };
};

const recharge = (data) => request.post('/recharge', data || {});
const createRechargeOrder = (data) => request.post('/recharge/order', data || {});

const createWithdrawal = (data) => request.post('/withdrawals', data || {});

const getWithdrawals = (params) => request.get('/withdrawals', params || {}).then((res) => {
  const data = res?.data || {};
  const list = toArray(data?.withdrawals || data?.list || data);
  return {
    ...res,
    data: {
      ...(data && typeof data === 'object' ? data : {}),
      list,
      withdrawals: list,
    },
  };
});

const getWithdrawAccounts = async () => {
  const me = await getUserInfo();
  const user = me?.data || {};
  return {
    success: true,
    data: {
      list: [
        {
          id: 'wechat_default',
          bankName: '微信零钱',
          accountNumber: user.phone ? String(user.phone).slice(0, 3) + '****' + String(user.phone).slice(-4) : '已授权微信账号',
          accountName: user.nickname || '微信账户',
        },
      ],
    },
  };
};

const getWithdrawalDetail = (id) => request.get('/withdrawals/' + id);

const getUserGroups = () => request.get('/chat/user-groups').then((res) => {
  const data = res?.data || {};
  const list = toArray(data);
  return {
    ...res,
    data: {
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
      list,
    },
  };
});

const getGroupMessages = (groupId, params) => request.get('/chat/groups/' + groupId + '/messages', params || {}).then((res) => {
  const data = res?.data || {};
  const list = toArray(data);
  return {
    ...res,
    data: {
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
      list,
    },
  };
});

const sendMessage = (groupId, data) => request.post('/chat/groups/' + groupId + '/messages', data || {});
const uploadMessageImage = (filePath) => request.upload('/chat/upload/image', filePath);

const getChatGroups = () => getUserGroups();
const getChatMessages = (groupId, params) => getGroupMessages(groupId, params);

const getChatGroupDetail = async (groupId) => {
  const groupRes = await getUserGroups();
  const list = groupRes?.data?.list || [];
  const group = list.find((item) => item.id === groupId) || { id: groupId, name: '聊天会话' };
  return {
    success: true,
    data: {
      group,
      order: group.order || null,
    },
  };
};

const clearUnreadMessages = () => Promise.resolve({ success: true });

const getHomepageConfig = () => request.get('/homepage-config');
const getCustomerServiceConfig = () => request.get('/customer-service/config');
const getOrCreateCustomerServiceGroup = () => request.post('/customer-service/group');

module.exports = {
  miniprogramLogin,
  bindPhone,
  manualBindPhone,
  sendSmsCode,
  phoneLogin,
  getUserInfo,
  updateUserInfo,
  verifyRealName,
  submitRealNameVerify,
  getVerifyResult,
  getVerifyHistory,
  getAccounts,
  getAccountDetail,
  createAccount,
  updateAccount,
  uploadAccountImage,
  uploadFile,
  uploadImage,
  createOrder,
  getOrders,
  getOrderDetail,
  verifyOrder,
  completeOrder,
  cancelOrder,
  balancePay,
  requestRefund,
  rateOrder,
  createMiniprogramPayment,
  createMinipPayment,
  wechatPay,
  queryPaymentStatus,
  getBalance,
  getWalletInfo,
  getWalletStatistics,
  getTransactions,
  getMonthlyBill,
  getUserStats,
  recharge,
  createRechargeOrder,
  createWithdrawal,
  getWithdrawals,
  getWithdrawAccounts,
  getWithdrawalDetail,
  getUserGroups,
  getGroupMessages,
  sendMessage,
  uploadMessageImage,
  getChatGroups,
  getChatMessages,
  getChatGroupDetail,
  clearUnreadMessages,
  getHomepageConfig,
  getCustomerServiceConfig,
  getOrCreateCustomerServiceGroup,
};
