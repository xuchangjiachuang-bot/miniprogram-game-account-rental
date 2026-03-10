// utils/config.js
const config = {
  // API 基础地址
  baseUrl: 'https://your-domain.com/api',
  
  // WebSocket 地址
  wsUrl: 'wss://your-domain.com',
  
  // 请求超时时间
  timeout: 30000,
  
  // 是否开启调试模式
  debug: false,
  
  // 存储键名
  storageKeys: {
    token: 'token',
    userInfo: 'userInfo',
    openid: 'openid',
    sessionKey: 'sessionKey',
    unionid: 'unionid'
  },
  
  // 微信支付配置
  payment: {
    miniprogram: {
      // 这些配置需要从后端获取
      appId: '', // 微信小程序AppID
      timeStamp: '',
      nonceStr: '',
      package: '',
      signType: 'MD5',
      paySign: ''
    }
  },
  
  // 分页配置
  pagination: {
    pageSize: 10,
    maxPageSize: 50
  },
  
  // 上传配置
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
    count: 9 // 最多上传9张
  },
  
  // 主题配置
  theme: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    dangerColor: '#ef4444',
    infoColor: '#3b82f6'
  }
};

// 小程序环境检测
const isDev = typeof wx !== 'undefined' && wx.getSystemInfoSync().platform !== 'devtools';

// 根据环境切换配置
// 默认开启调试模式
config.debug = true;

module.exports = config;
