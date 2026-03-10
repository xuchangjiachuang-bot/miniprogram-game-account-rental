// utils/config.js
// 环境配置：development | production
// 开发时设置为 'development'，发布时设置为 'production'
const ENV = 'production';

// 环境配置
const environments = {
  // 开发环境（本地开发环境）
  development: {
    baseUrl: 'http://localhost:5000/api',
    wsUrl: 'ws://localhost:5000',
    debug: true,
    useMockData: false,
  },

  // 生产环境（正式上线）
  production: {
    // 使用专用 API 子域名（生产环境）
    baseUrl: 'https://hfb.yugioh.top/api',
    wsUrl: 'wss://hfb.yugioh.top',

    debug: false,
    useMockData: false,  // 关闭Mock数据，使用真实API
  },
};

const config = {
  // 当前环境
  env: ENV,

  // 根据环境选择配置
  ...environments[ENV],

  // 请求超时时间
  timeout: 30000,
  
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

// 导出配置
module.exports = config;
