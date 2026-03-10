/**
 * 定时任务服务
 * 用于在应用内部执行定时任务，检查到期订单并自动完成
 */

/**
 * 启动定时任务
 * 每5分钟检查一次到期的订单
 */
export function startCronJobs() {
  console.log('🕐 启动定时任务服务...');

  // 每5分钟（300000毫秒）执行一次
  const interval = 5 * 60 * 1000;

  // 立即执行一次
  checkExpiredOrders();

  // 设置定时任务
  const cronJob = setInterval(checkExpiredOrders, interval);

  console.log(`✅ 定时任务已启动，每 ${interval / 60000} 分钟检查一次到期订单`);

  // 返回取消函数
  return () => {
    clearInterval(cronJob);
    console.log('⏹️ 定时任务已停止');
  };
}

/**
 * 检查到期订单
 */
async function checkExpiredOrders() {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 开始检查到期订单...`);

    const response = await fetch('http://localhost:5000/api/orders/check-expired', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('检查到期订单失败:', response.status, response.statusText);
      return;
    }

    const result = await response.json();

    console.log(`[${timestamp}] 检查完成:`, {
      checked: result.checkedCount,
      completed: result.completedCount,
      failed: result.failedCount,
      message: result.message
    });

    // 如果有失败的订单，记录详细信息
    if (result.failedCount > 0 && result.errors) {
      console.error('失败的订单:', result.errors);
    }
  } catch (error) {
    console.error('检查到期订单时发生错误:', error);
  }
}
