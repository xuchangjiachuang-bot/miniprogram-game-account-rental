// components/customer-service-float/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: true
    },
    showText: {
      type: Boolean,
      value: true
    },
    showClose: {
      type: Boolean,
      value: true
    },
    autoHide: {
      type: Boolean,
      value: true
    },
    hideDelay: {
      type: Number,
      value: 5000 // 5秒后自动隐藏
    }
  },

  data: {
    hideTimer: null,
    customerServiceConfig: null
  },

  lifetimes: {
    attached() {
      // 获取客服配置
      this.loadCustomerServiceConfig();

      if (this.properties.autoHide && this.properties.visible) {
        this.startAutoHide();
      }
    },

    detached() {
      this.clearAutoHide();
    }
  },

  observers: {
    'visible': function(newVal) {
      if (newVal && this.properties.autoHide) {
        this.startAutoHide();
      } else {
        this.clearAutoHide();
      }
    }
  },

  methods: {
    /**
     * 点击按钮
     */
    onTap() {
      // 触发点击事件
      this.triggerEvent('tap');

      // 打开企业微信客服
      this.openCustomerService();
    },

    /**
     * 关闭按钮
     */
    onClose() {
      this.clearAutoHide();
      this.triggerEvent('close');
    },

    /**
     * 加载客服配置
     */
    loadCustomerServiceConfig() {
      const app = getApp();
      const baseUrl = app.globalData.baseUrl;

      if (!baseUrl) {
        console.warn('baseUrl 未配置，无法加载客服配置');
        return;
      }

      wx.request({
        url: baseUrl + '/api/customer-service/config',
        method: 'GET',
        success: (res) => {
          console.log('获取客服配置成功:', res.data);
          if (res.data && res.data.success && res.data.data) {
            this.setData({
              customerServiceConfig: res.data.data
            });
          }
        },
        fail: (err) => {
          console.error('获取客服配置失败:', err);
        }
      });
    },

    /**
     * 打开企业微信客服
     */
    openCustomerService() {
      const config = this.data.customerServiceConfig;

      if (!config || !config.kfUrl) {
        console.warn('客服配置未加载，使用默认方式');
        this.fallbackOpenService();
        return;
      }

      console.log('打开客服，配置:', config);

      // 使用企业微信客服小程序打开客服
      wx.navigateToMiniProgram({
        appId: 'wx8bdac1ca7cb34520', // 企业微信客服小程序的 AppID
        path: '/pages/card-share/index?kf_account=' + encodeURIComponent(config.kfUrl),
        success: () => {
          console.log('打开企业微信客服成功');
        },
        fail: (err) => {
          console.error('打开企业微信客服失败:', err);
          // 如果失败，使用备选方案
          this.fallbackOpenService();
        }
      });
    },

    /**
     * 备选方案：打开客服页面或联系客服
     */
    fallbackOpenService() {
      const config = this.data.customerServiceConfig;
      const message = config && config.welcomeMessage
        ? config.welcomeMessage
        : '客服微信号: your_wechat_id\n或扫描二维码联系客服';

      // 显示提示
      wx.showModal({
        title: '联系客服',
        content: message,
        showCancel: false,
        confirmText: '我知道了'
      });
    },

    /**
     * 开始自动隐藏计时器
     */
    startAutoHide() {
      this.clearAutoHide();
      const timer = setTimeout(() => {
        this.triggerEvent('close');
      }, this.properties.hideDelay);
      this.setData({ hideTimer: timer });
    },

    /**
     * 清除自动隐藏计时器
     */
    clearAutoHide() {
      if (this.data.hideTimer) {
        clearTimeout(this.data.hideTimer);
        this.setData({ hideTimer: null });
      }
    }
  }
});
