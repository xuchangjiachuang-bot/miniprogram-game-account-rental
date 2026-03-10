// utils/order-transformer.js
/**
 * 订单数据转换工具
 * 用于统一处理订单API返回的数据，转换为前端需要的格式
 */

// 订单状态映射
const statusMap = {
  'pending_payment': '待付款',
  'paid': '已付款',
  'pending_start': '待开始',
  'renting': '租赁中',
  'rented': '已结束',
  'dispute': '争议中',
  'completed': '已完成',
  'cancelled': '已取消',
  'refunded': '已退款'
};

// 订单状态颜色映射
const statusColorMap = {
  'pending_payment': '#ff9f43',
  'paid': '#54a0ff',
  'pending_start': '#2ed573',
  'renting': '#00d2d3',
  'rented': '#5f27cd',
  'dispute': '#ff6b6b',
  'completed': '#1dd1a1',
  'cancelled': '#8395a7',
  'refunded': '#a4b0be'
};

/**
 * 转换单个订单数据
 */
function transformOrder(order) {
  if (!order) return null;

  // 处理账号信息
  const account = {
    id: order.accountId,
    name: order.accountName || '游戏账号',
    image: order.accountImage || '/images/default-account.png',
    coins: order.coinsM ? `${order.coinsM}M` : '-',
    ratio: order.rentalRatio ? `1:${Math.round(parseFloat(order.rentalRatio))}` : '1:35',
    safebox: order.safeboxCount ? `${order.safeboxCount}格` : '-',
    stamina: order.staminaValue ? `${order.staminaValue}体力` : '-',
    load: order.energyValue ? `${order.energyValue}负重` : '-'
  };

  // 计算租期
  let rentalPeriod = '-';
  if (order.startTime && order.endTime) {
    const start = new Date(order.startTime);
    const end = new Date(order.endTime);
    const diff = end - start;
    const hours = diff / (1000 * 60 * 60);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      rentalPeriod = remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
    } else {
      rentalPeriod = `${hours}小时`;
    }
  }

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return {
    id: order.id,
    order_number: order.orderNo || order.order_number,
    status: order.status,
    statusText: statusMap[order.status] || order.status || '未知',
    statusColor: statusColorMap[order.status] || '#999999',
    account,
    rental_price: parseFloat(order.rentalPrice || 0).toFixed(2),
    deposit: parseFloat(order.deposit || 0).toFixed(2),
    total_price: parseFloat(order.totalPrice || 0).toFixed(2),
    rental_period: rentalPeriod,
    rental_start: formatTime(order.startTime),
    rental_end: formatTime(order.endTime),
    created_at: formatTime(order.createdAt),
    payment_time: order.paymentTime ? formatTime(order.paymentTime) : '-',
    seller_id: order.sellerId,
    buyer_id: order.buyerId,
    showActions: shouldShowActions(order),
    actions: getOrderActions(order),
    canCancel: ['pending_payment', 'pending_start'].includes(order.status),
    canPay: order.status === 'pending_payment',
    canChat: ['pending_start', 'renting', 'dispute'].includes(order.status),
    canExtend: order.status === 'renting'
  };
}

/**
 * 转换订单列表
 */
function transformOrderList(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(order => transformOrder(order));
}

/**
 * 是否显示操作按钮
 */
function shouldShowActions(order) {
  const { status } = order;
  return ['pending_payment', 'pending_start', 'renting', 'dispute'].includes(status);
}

/**
 * 获取订单操作
 */
function getOrderActions(order) {
  const { status } = order;
  const actions = [];

  switch (status) {
    case 'pending_payment':
      actions.push({ key: 'pay', text: '立即支付', type: 'primary' });
      actions.push({ key: 'cancel', text: '取消订单', type: 'danger' });
      break;
    case 'pending_start':
      actions.push({ key: 'chat', text: '联系客服', type: 'default' });
      actions.push({ key: 'cancel', text: '取消订单', type: 'danger' });
      break;
    case 'renting':
      actions.push({ key: 'chat', text: '进入聊天', type: 'primary' });
      actions.push({ key: 'extend', text: '续租', type: 'default' });
      break;
    case 'dispute':
      actions.push({ key: 'chat', text: '协商处理', type: 'primary' });
      actions.push({ key: 'appeal', text: '申诉', type: 'danger' });
      break;
  }

  return actions;
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  return statusMap[status] || status || '未知';
}

/**
 * 获取状态颜色
 */
function getStatusColor(status) {
  return statusColorMap[status] || '#999999';
}

/**
 * 计算订单进度百分比
 */
function calculateProgress(order) {
  if (!order.startTime || !order.endTime || order.status !== 'renting') {
    return 0;
  }

  const start = new Date(order.startTime).getTime();
  const end = new Date(order.endTime).getTime();
  const now = Date.now();

  if (now <= start) return 0;
  if (now >= end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

module.exports = {
  transformOrder,
  transformOrderList,
  shouldShowActions,
  getOrderActions,
  getStatusText,
  getStatusColor,
  calculateProgress,
  statusMap,
  statusColorMap
};
