// utils/api.js
const request = require('./request.js');

// ============ 认证相关 ============

/**
 * 小程序登录
 */
const miniprogramLogin = (code) => {
  return request.post('/auth/miniprogram/login', { code });
};

/**
 * 绑定手机号
 */
const bindPhone = (data) => {
  return request.post('/auth/miniprogram/bind-phone', data);
};

/**
 * 手动绑定手机号
 */
const manualBindPhone = (data) => {
  return request.post('/auth/bind-phone', data);
};

/**
 * 发送验证码
 */
const sendSmsCode = (phone) => {
  return request.post('/auth/sms/send', { phone });
};

/**
 * 获取当前用户信息
 */
const getUserInfo = () => {
  return request.get('/auth/me');
};

/**
 * 实名认证
 */
const verifyRealName = (data) => {
  return request.post('/auth/verification', data);
};

// ============ 账号相关 ============

/**
 * 获取账号列表
 */
const getAccounts = (params) => {
  return request.get('/accounts', params);
};

/**
 * 获取账号详情
 */
const getAccountDetail = (id) => {
  return request.get(`/accounts/${id}`);
};

/**
 * 创建账号（发布账号）
 */
const createAccount = (data) => {
  return request.post('/accounts', data);
};

/**
 * 更新账号
 */
const updateAccount = (id, data) => {
  return request.put(`/accounts/${id}`, data);
};

/**
 * 上传账号图片
 */
const uploadAccountImage = (filePath) => {
  return request.upload('/upload/image', filePath);
};

// ============ 订单相关 ============

/**
 * 创建订单
 */
const createOrder = (data) => {
  return request.post('/orders', data);
};

/**
 * 获取订单列表
 */
const getOrders = (params) => {
  return request.get('/orders', params);
};

/**
 * 获取订单详情
 */
const getOrderDetail = (id) => {
  return request.get(`/orders/${id}`);
};

/**
 * 确认验收账号
 */
const verifyOrder = (id, data) => {
  return request.post(`/orders/${id}/verify`, data);
};

/**
 * 完成订单（归还账号）
 */
const completeOrder = (id) => {
  return request.post(`/orders/${id}`, { action: 'complete' });
};

/**
 * 申请退款
 */
const requestRefund = (id, reason) => {
  return request.post(`/orders/${id}/refund`, { reason });
};

/**
 * 评价订单
 */
const rateOrder = (id, data) => {
  return request.post(`/orders/${id}/rate`, data);
};

// ============ 支付相关 ============

/**
 * 创建小程序支付订单
 */
const createMiniprogramPayment = (orderId) => {
  return request.post('/payment/wechat/miniprogram/create', { orderId });
};

/**
 * 查询支付状态
 */
const queryPaymentStatus = (orderId) => {
  return request.get(`/payment/status/${orderId}`);
};

// ============ 余额相关 ============

/**
 * 获取余额信息
 */
const getBalance = () => {
  return request.get('/balance');
};

/**
 * 充值
 */
const recharge = (data) => {
  return request.post('/recharge', data);
};

/**
 * 创建充值订单
 */
const createRechargeOrder = (data) => {
  return request.post('/recharge/order', data);
};

// ============ 提现相关 ============

/**
 * 创建提现申请
 */
const createWithdrawal = (data) => {
  return request.post('/withdrawals', data);
};

/**
 * 获取提现记录
 */
const getWithdrawals = (params) => {
  return request.get('/withdrawals', params);
};

/**
 * 获取提现详情
 */
const getWithdrawalDetail = (id) => {
  return request.get(`/withdrawals/${id}`);
};

// ============ 聊天相关 ============

/**
 * 获取用户群组列表
 */
const getUserGroups = () => {
  return request.get('/chat/user-groups');
};

/**
 * 获取群组消息列表
 */
const getGroupMessages = (groupId, params) => {
  return request.get(`/chat/groups/${groupId}/messages`, params);
};

/**
 * 发送消息
 */
const sendMessage = (groupId, data) => {
  return request.post(`/chat/groups/${groupId}/messages`, data);
};

/**
 * 上传消息图片
 */
const uploadMessageImage = (filePath) => {
  return request.upload('/chat/upload/image', filePath);
};

// ============ 首页配置相关 ============

/**
 * 获取首页配置
 */
const getHomepageConfig = () => {
  return request.get('/homepage-config');
};

// ============ 客服相关 ============

/**
 * 获取客服配置
 */
const getCustomerServiceConfig = () => {
  return request.get('/customer-service/config');
};

/**
 * 获取或创建客服群组
 */
const getOrCreateCustomerServiceGroup = () => {
  return request.post('/customer-service/group');
};

// ============ 导出 ============

module.exports = {
  // 认证
  miniprogramLogin,
  bindPhone,
  manualBindPhone,
  sendSmsCode,
  getUserInfo,
  verifyRealName,
  
  // 账号
  getAccounts,
  getAccountDetail,
  createAccount,
  updateAccount,
  uploadAccountImage,
  
  // 订单
  createOrder,
  getOrders,
  getOrderDetail,
  verifyOrder,
  completeOrder,
  requestRefund,
  rateOrder,
  
  // 支付
  createMiniprogramPayment,
  queryPaymentStatus,
  
  // 余额
  getBalance,
  recharge,
  createRechargeOrder,
  
  // 提现
  createWithdrawal,
  getWithdrawals,
  getWithdrawalDetail,
  
  // 聊天
  getUserGroups,
  getGroupMessages,
  sendMessage,
  uploadMessageImage,
  
  // 首页配置
  getHomepageConfig,
  
  // 客服
  getCustomerServiceConfig,
  getOrCreateCustomerServiceGroup
};
