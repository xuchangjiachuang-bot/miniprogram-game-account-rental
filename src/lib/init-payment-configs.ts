/**
 * 初始化支付配置到数据库
 * 从环境变量读取配置并保存到数据库
 */

import { initDefaultPaymentConfigs } from '../lib/payment/config';

export async function initPaymentConfigs() {
  try {
    console.log('[Payment Config] 初始化支付配置...');

    await initDefaultPaymentConfigs();

    console.log('[Payment Config] 支付配置初始化完成');
  } catch (error) {
    console.error('[Payment Config] 初始化支付配置失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPaymentConfigs()
    .then(() => {
      console.log('初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}
