const config = require('./config.js');
const storage = require('./storage.js');

function extractErrorMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data !== 'object') return '';

  return String(data.error || data.message || data.msg || '').trim();
}

class Request {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.interceptors = {
      request: [],
      response: [],
    };
  }

  addRequestInterceptor(fn) {
    this.interceptors.request.push(fn);
  }

  addResponseInterceptor(fn) {
    this.interceptors.response.push(fn);
  }

  async handleRequest(options) {
    let requestOptions = { ...options };
    const token = storage.getToken();

    if (token) {
      requestOptions.header = requestOptions.header || {};
      requestOptions.header.Authorization = `Bearer ${token}`;
    }

    for (const interceptor of this.interceptors.request) {
      requestOptions = (await interceptor(requestOptions)) || requestOptions;
    }

    return requestOptions;
  }

  async handleResponse(response, options) {
    let result = response;

    for (const interceptor of this.interceptors.response) {
      result = (await interceptor(result, options)) || result;
    }

    return result;
  }

  request(options) {
    return new Promise(async (resolve, reject) => {
      const requestOptions = await this.handleRequest(options);
      const url = requestOptions.url.startsWith('http')
        ? requestOptions.url
        : `${this.baseUrl}${requestOptions.url}`;

      wx.request({
        url,
        method: requestOptions.method || 'GET',
        data: requestOptions.data,
        header: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Client-Type': 'miniprogram',
          'X-Client-Platform': 'wechat',
          ...requestOptions.header,
        },
        timeout: this.timeout,
        success: async (res) => {
          const contentType = res.header['content-type'] || res.header['Content-Type'] || '';
          if (contentType.includes('text/html') || typeof res.data === 'string') {
            console.error('API returned HTML instead of JSON, request may be blocked by CDN verification.');
            reject({
              success: false,
              error: 'API 服务暂时不可用，请稍后重试',
              statusCode: res.statusCode,
              isCDNBlocked: true,
              data: res.data,
            });
            return;
          }

          const result = await this.handleResponse(res, requestOptions);

          if (result.statusCode >= 200 && result.statusCode < 300) {
            if (result.data && result.data.success) {
              resolve(result.data);
              return;
            }

            reject({
              success: false,
              error: extractErrorMessage(result.data) || '请求失败',
              code: result.data && result.data.code,
              data: result.data,
            });
            return;
          }

          reject({
            success: false,
            error: extractErrorMessage(result.data) || '网络请求失败',
            statusCode: result.statusCode,
            data: result.data,
          });
        },
        fail: (error) => {
          reject({
            success: false,
            error: error.errMsg || '网络请求失败',
            data: error,
          });
        },
      });
    });
  }

  get(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'GET',
      data,
      ...options,
    });
  }

  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options,
    });
  }

  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options,
    });
  }

  delete(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data,
      ...options,
    });
  }

  upload(url, filePath, options = {}) {
    return new Promise(async (resolve, reject) => {
      const requestOptions = await this.handleRequest(options);
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      const token = storage.getToken();

      wx.uploadFile({
        url: fullUrl,
        filePath,
        name: 'file',
        header: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        success: async (res) => {
          const result = await this.handleResponse(res, requestOptions);

          if (result.statusCode >= 200 && result.statusCode < 300) {
            try {
              const data = JSON.parse(result.data);
              if (data.success) {
                resolve(data);
                return;
              }

              reject({
                success: false,
                error: extractErrorMessage(data) || '上传失败',
                data,
              });
            } catch (error) {
              reject({
                success: false,
                error: '响应数据格式错误',
                data: error,
              });
            }
            return;
          }

          reject({
            success: false,
            error: '上传失败',
            statusCode: result.statusCode,
            data: result.data,
          });
        },
        fail: (error) => {
          reject({
            success: false,
            error: error.errMsg || '上传失败',
            data: error,
          });
        },
      });
    });
  }
}

const request = new Request();

request.addRequestInterceptor((options) => {
  if (config.debug) {
    console.log('[Request]', options.method, options.url, options.data);
  }
  return options;
});

request.addResponseInterceptor((response) => {
  if (config.debug) {
    console.log('[Response]', response.statusCode, response.data);
  }

  if (response.statusCode === 401) {
    storage.removeToken();
    storage.removeUserInfo();

    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.showLoginModal === 'function') {
        currentPage.showLoginModal();
      }
    }
  }

  return response;
});

module.exports = request;
