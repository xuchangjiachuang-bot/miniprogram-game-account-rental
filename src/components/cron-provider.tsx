'use client';

import { useEffect, useState } from 'react';

export function CronProvider() {
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (isStarted) return;

    // 只在客户端启动一次
    if (typeof window !== 'undefined') {
      setIsStarted(true);
      startCheckExpiredOrders();

      // 立即执行一次检查
      checkExpiredOrders();

      // 每5分钟执行一次
      const interval = setInterval(checkExpiredOrders, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        console.log('⏹️ 定时任务已停止');
      };
    }
  }, [isStarted]);

  async function checkExpiredOrders() {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 开始检查到期订单...`);

      const response = await fetch('/api/orders/check-expired', {
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

  function startCheckExpiredOrders() {
    console.log('🕐 启动定时任务服务...');
    console.log('✅ 定时任务已启动，每 5 分钟检查一次到期订单');
  }

  return null; // 这个组件不渲染任何内容
}
