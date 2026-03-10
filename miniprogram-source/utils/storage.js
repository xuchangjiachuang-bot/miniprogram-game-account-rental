// utils/storage.js
const config = require('./config.js');

class Storage {
  /**
   * 设置数据
   * @param {string} key - 键名
   * @param {any} value - 值
   * @param {boolean} encrypt - 是否加密
   */
  set(key, value, encrypt = false) {
    try {
      const data = encrypt ? JSON.stringify({ _encrypted: true, value }) : value;
      wx.setStorageSync(key, data);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * 获取数据
   * @param {string} key - 键名
   * @param {any} defaultValue - 默认值
   */
  get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key);
      if (data === '') return defaultValue;
      
      if (typeof data === 'string') {
        // 尝试解析JSON
        try {
          const parsed = JSON.parse(data);
          if (parsed._encrypted) {
            return parsed.value;
          }
          return parsed;
        } catch {
          return data;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  /**
   * 删除数据
   * @param {string} key - 键名
   */
  remove(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  clear() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * 获取所有数据
   */
  getAll() {
    try {
      return wx.getStorageInfoSync();
    } catch (error) {
      console.error('Storage getAll error:', error);
      return null;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key - 键名
   */
  has(key) {
    try {
      const data = wx.getStorageSync(key);
      return data !== '';
    } catch (error) {
      console.error('Storage has error:', error);
      return false;
    }
  }
}

// 实例化
const storage = new Storage();

// 便捷方法
storage.setToken = (token) => storage.set(config.storageKeys.token, token);
storage.getToken = () => storage.get(config.storageKeys.token, null);
storage.removeToken = () => storage.remove(config.storageKeys.token);

storage.setUserInfo = (userInfo) => storage.set(config.storageKeys.userInfo, userInfo);
storage.getUserInfo = () => storage.get(config.storageKeys.userInfo, null);
storage.removeUserInfo = () => storage.remove(config.storageKeys.userInfo);

storage.setOpenid = (openid) => storage.set(config.storageKeys.openid, openid);
storage.getOpenid = () => storage.get(config.storageKeys.openid, null);

storage.setSessionKey = (sessionKey) => storage.set(config.storageKeys.sessionKey, sessionKey);
storage.getSessionKey = () => storage.get(config.storageKeys.sessionKey, null);

storage.setUnionid = (unionid) => storage.set(config.storageKeys.unionid, unionid);
storage.getUnionid = () => storage.get(config.storageKeys.unionid, null);

module.exports = storage;
