// utils/config.js
const ENV = 'production';

const environments = {
  development: {
    baseUrl: 'http://localhost:5000/api',
    wsUrl: 'ws://localhost:5000',
    debug: true,
    useMockData: false,
  },
  production: {
    baseUrl: 'https://hfb.yugioh.top/api',
    wsUrl: 'wss://hfb.yugioh.top',
    debug: false,
    useMockData: false,
  },
};

const config = {
  env: ENV,
  ...environments[ENV],
  timeout: 30000,
  storageKeys: {
    token: 'token',
    userInfo: 'userInfo',
    openid: 'openid',
    sessionKey: 'sessionKey',
    unionid: 'unionid',
  },
  payment: {
    miniprogram: {
      appId: '',
      timeStamp: '',
      nonceStr: '',
      package: '',
      signType: 'MD5',
      paySign: '',
    },
  },
  pagination: {
    pageSize: 10,
    maxPageSize: 50,
  },
  upload: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
    count: 9,
  },
  theme: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    dangerColor: '#ef4444',
    infoColor: '#3b82f6',
  },
};

module.exports = config;
