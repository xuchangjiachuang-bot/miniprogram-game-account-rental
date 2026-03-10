// utils/request.js
const config = require('./config.js');
const storage = require('./storage.js');

class Request {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.interceptors = {
      request: [],
      response: []
    };
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(fn) {
    this.interceptors.request.push(fn);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(fn) {
    this.interceptors.response.push(fn);
  }

  /**
   * 处理请求拦截
   */
  async handleRequest(options) {
    let requestOptions = { ...options };

    // 添加token
    const token = storage.getToken();
    if (token) {
      requestOptions.header = requestOptions.header || {};
      requestOptions.header['Authorization'] = `Bearer ${token}`;
    }

    // 执行请求拦截器
    for (const interceptor of this.interceptors.request) {
      requestOptions = await interceptor(requestOptions) || requestOptions;
    }

    return requestOptions;
  }

  /**
   * 处理响应拦截
   */
  async handleResponse(response, options) {
    let result = response;

    // 执行响应拦截器
    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result, options) || result;
    }

    return result;
  }

  /**
   * 通用请求方法
   */
  request(options) {
    return new Promise(async (resolve, reject) => {
      // 处理请求拦截
      const requestOptions = await this.handleRequest(options);

      // 完整URL
      const url = requestOptions.url.startsWith('http')
        ? requestOptions.url
        : `${this.baseUrl}${requestOptions.url}`;

      // 发起请求
      wx.request({
        url,
        method: requestOptions.method || 'GET',
        data: requestOptions.data,
        header: {
          'Content-Type': 'application/json',
          ...requestOptions.header
        },
        timeout: this.timeout,
        success: async (res) => {
          // 处理响应拦截
          const result = await this.handleResponse(res, requestOptions);
          
          if (result.statusCode >= 200 && result.statusCode < 300) {
            if (result.data.success) {
              resolve(result.data);
            } else {
              // 业务错误
              reject({
                success: false,
                error: result.data.error || '请求失败',
                code: result.data.code,
                data: result.data
              });
            }
          } else {
            // HTTP错误
            reject({
              success: false,
              error: '网络请求失败',
              statusCode: result.statusCode,
              data: result.data
            });
          }
        },
        fail: (error) => {
          reject({
            success: false,
            error: error.errMsg || '网络请求失败',
            data: error
          });
        }
      });
    });
  }

  /**
   * GET请求
   */
  get(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'GET',
      data,
      ...options
    });
  }

  /**
   * POST请求
   */
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    });
  }

  /**
   * PUT请求
   */
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    });
  }

  /**
   * DELETE请求
   */
  delete(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data,
      ...options
    });
  }

  /**
   * 上传文件
   */
  upload(url, filePath, options = {}) {
    return new Promise(async (resolve, reject) => {
      // 处理请求拦截
      const requestOptions = await this.handleRequest(options);

      // 完整URL
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

      // 获取token
      const token = storage.getToken();

      wx.uploadFile({
        url: fullUrl,
        filePath,
        name: 'file',
        header: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: async (res) => {
          const result = await this.handleResponse(res, requestOptions);
          
          if (result.statusCode >= 200 && result.statusCode < 300) {
            try {
              const data = JSON.parse(result.data);
              if (data.success) {
                resolve(data);
              } else {
                reject({
                  success: false,
                  error: data.error || '上传失败'
                });
              }
            } catch {
              reject({
                success: false,
                error: '响应数据格式错误'
              });
            }
          } else {
            reject({
              success: false,
              error: '上传失败',
              statusCode: result.statusCode
            });
          }
        },
        fail: (error) => {
          reject({
            success: false,
            error: error.errMsg || '上传失败'
          });
        }
      });
    });
  }
}

// 实例化
const request = new Request();

// 添加默认请求拦截器
request.addRequestInterceptor((options) => {
  // 打印请求信息（调试模式）
  if (config.debug) {
    console.log('[Request]', options.method, options.url, options.data);
  }
  return options;
});

// 添加默认响应拦截器
request.addResponseInterceptor((response) => {
  // 打印响应信息（调试模式）
  if (config.debug) {
    console.log('[Response]', response.statusCode, response.data);
  }
  
  // 处理401未授权
  if (response.statusCode === 401) {
    storage.removeToken();
    storage.removeUserInfo();
    
    // 跳转到登录页
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && !currentPage.route.includes('auth/login')) {
      wx.redirectTo({
        url: '/pages/auth/login/index'
      });
    }
  }
  
  return response;
});

module.exports = request;
