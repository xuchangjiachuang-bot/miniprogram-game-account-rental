/**
 * 订单号生成工具函数
 */

/**
 * 生成订单号
 * 格式: HFB + 时间戳(14位) + 随机数(4位)
 * 例如: HFB202602271703451234
 */
export function generateOrderNo(): string {
  // 获取当前时间
  const now = new Date();

  // 格式化时间: YYYYMMDDHHmmss
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  // 生成4位随机数
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  // 拼接订单号
  return `HFB${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * 验证订单号格式
 */
export function isValidOrderNo(orderNo: string): boolean {
  // 订单号格式: HFB + 14位时间 + 4位随机数 = 23位
  const pattern = /^HFB\d{14}\d{4}$/;
  return pattern.test(orderNo);
}

/**
 * 从订单号提取时间信息
 */
export function extractTimeFromOrderNo(orderNo: string): Date | null {
  if (!isValidOrderNo(orderNo)) {
    return null;
  }

  try {
    // 提取时间部分 (去掉 HFB 和最后4位随机数)
    const timeStr = orderNo.substring(3, 17);

    const year = parseInt(timeStr.substring(0, 4));
    const month = parseInt(timeStr.substring(4, 6)) - 1; // 月份从0开始
    const day = parseInt(timeStr.substring(6, 8));
    const hours = parseInt(timeStr.substring(8, 10));
    const minutes = parseInt(timeStr.substring(10, 12));
    const seconds = parseInt(timeStr.substring(12, 14));

    return new Date(year, month, day, hours, minutes, seconds);
  } catch (error) {
    return null;
  }
}
