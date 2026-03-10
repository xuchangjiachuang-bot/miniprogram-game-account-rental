/**
 * 小程序配置文件
 * 
 * 使用说明：
 * 1. 将API_BASE_URL替换为您的后端API地址
 * 2. 将WEBSOCKET_URL替换为您的WebSocket地址
 * 3. 确保域名已在微信公众平台配置白名单
 */

// 🔧 需要配置的参数
const config = {
  // 后端API地址（必需）
  // 格式：https://your-domain.com
  API_BASE_URL: 'https://your-api-domain.com',
  
  // WebSocket地址（必需，用于聊天功能）
  // 格式：wss://your-domain.com
  WEBSOCKET_URL: 'wss://your-socket-domain.com',
  
  // 小程序AppID（已配置）
  APPID: 'twx2382e1949d031ba6',
  
  // 对象存储地址（可选，用于图片上传）
  OSS_BASE_URL: 'https://your-oss-domain.com',
  
  // 环境配置
  ENV: 'development', // development | production
  
  // 其他配置
  TIMEOUT: 30000, // 请求超时时间（毫秒）
  MAX_RETRY: 3, // 最大重试次数
};

/**
 * 获取完整的API地址
 * @param {string} path - API路径，例如：/api/accounts
 * @returns {string} 完整的API地址
 */
function getApiUrl(path) {
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return config.API_BASE_URL + normalizedPath;
}

/**
 * 获取WebSocket地址
 * @returns {string} WebSocket地址
 */
function getWebSocketUrl() {
  return config.WEBSOCKET_URL;
}

/**
 * 是否为生产环境
 * @returns {boolean}
 */
function isProduction() {
  return config.ENV === 'production';
}

/**
 * 获取配置信息
 * @returns {object} 配置对象
 */
function getConfig() {
  return config;
}

module.exports = {
  ...config,
  getApiUrl,
  getWebSocketUrl,
  isProduction,
  getConfig
};
