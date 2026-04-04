/**
 * Order data transformer for mini program pages.
 */

const statusAliasMap = {
  pending_start: 'pending_verification',
  renting: 'active',
  dispute: 'disputed',
};

const statusTextMap = {
  pending_payment: '待支付',
  paid: '已支付',
  pending_verification: '待验收',
  pending_consumption_confirm: '待确认结算',
  active: '租赁中',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '争议中',
  refunding: '退款中',
  refunded: '已退款',
};

const statusColorMap = {
  pending_payment: '#ff9f43',
  paid: '#54a0ff',
  pending_verification: '#2ed573',
  pending_consumption_confirm: '#20bf6b',
  active: '#00d2d3',
  completed: '#1dd1a1',
  cancelled: '#8395a7',
  disputed: '#ff6b6b',
  refunding: '#ffa502',
  refunded: '#a4b0be',
};

function normalizeStatus(status) {
  return statusAliasMap[status] || status || 'pending_payment';
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function getRentalPeriod(order) {
  if (order.startTime && order.endTime) {
    const start = new Date(order.startTime).getTime();
    const end = new Date(order.endTime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const totalHours = (end - start) / (1000 * 60 * 60);
      if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const hours = Math.round(totalHours % 24);
        return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
      }
      return `${Math.round(totalHours)}小时`;
    }
  }

  const rentalHours = Number(order.rentalDuration || order.rent_hours || 0);
  if (rentalHours > 0) {
    if (rentalHours >= 24) {
      const days = Math.floor(rentalHours / 24);
      const hours = rentalHours % 24;
      return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
    }
    return `${rentalHours}小时`;
  }

  return '-';
}

function buildActions(status) {
  switch (status) {
    case 'pending_payment':
      return [
        { key: 'pay', text: '立即支付', type: 'primary' },
        { key: 'cancel', text: '取消订单', type: 'danger' },
      ];
    case 'active':
      return [
        { key: 'chat', text: '进入聊天', type: 'primary' },
        { key: 'complete', text: '归还账号', type: 'outline' },
      ];
    case 'disputed':
      return [
        { key: 'chat', text: '协商处理', type: 'primary' },
      ];
    default:
      return [];
  }
}

function transformOrder(order) {
  if (!order) return null;

  const status = normalizeStatus(order.status);
  const actions = buildActions(status);

  const account = {
    id: order.accountId || order.account_id,
    name: order.accountName || order.account_name || '游戏账号',
    image: order.accountImage || order.account_image || '/images/default-account.png',
    coins: order.coinsM ? `${order.coinsM}M` : '-',
    ratio: order.rentalRatio ? `1:${Math.round(Number(order.rentalRatio))}` : '1:35',
    safebox: order.safeboxCount ? `${order.safeboxCount}个保险箱` : '-',
    stamina: order.staminaValue ? `${order.staminaValue}体力` : '-',
    load: order.energyValue ? `${order.energyValue}负重` : '-',
  };

  return {
    id: order.id,
    order_number: order.orderNo || order.order_number || '-',
    status,
    statusText: statusTextMap[status] || status,
    statusColor: statusColorMap[status] || '#999999',
    account,
    rental_price: Number(order.rentalPrice || order.rent_amount || 0).toFixed(2),
    deposit: Number(order.deposit || order.deposit_amount || 0).toFixed(2),
    total_price: Number(order.totalPrice || order.total_price || 0).toFixed(2),
    rental_period: getRentalPeriod(order),
    rental_start: order.startTime ? formatTime(order.startTime) : '',
    rental_end: order.endTime ? formatTime(order.endTime) : '',
    created_at: formatTime(order.createdAt),
    payment_time: order.paymentTime ? formatTime(order.paymentTime) : '',
    seller_id: order.sellerId || order.seller_id,
    buyer_id: order.buyerId || order.buyer_id,
    showActions: actions.length > 0,
    actions,
    canCancel: status === 'pending_payment',
    canPay: status === 'pending_payment',
    canChat: ['active', 'pending_verification', 'pending_consumption_confirm', 'disputed'].includes(status),
    canExtend: false,
  };
}

function transformOrderList(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => transformOrder(order)).filter(Boolean);
}

function shouldShowActions(order) {
  if (!order) return false;
  return buildActions(normalizeStatus(order.status)).length > 0;
}

function getOrderActions(order) {
  if (!order) return [];
  return buildActions(normalizeStatus(order.status));
}

function getStatusText(status) {
  const normalized = normalizeStatus(status);
  return statusTextMap[normalized] || normalized;
}

function getStatusColor(status) {
  const normalized = normalizeStatus(status);
  return statusColorMap[normalized] || '#999999';
}

function calculateProgress(order) {
  const status = normalizeStatus(order?.status);
  if (!order?.startTime || !order?.endTime || status !== 'active') {
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
  statusMap: statusTextMap,
  statusColorMap,
};
