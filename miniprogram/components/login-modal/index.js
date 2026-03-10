// components/login-modal/index.js
const api = require('../../utils/api.js');
const storage = require('../../utils/storage.js');
const app = getApp();

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    userInfo: null
  },

  methods: {
    /**
     * 点击遮罩层
     */
    onMaskTap() {
      // 阻止关闭，强制用户登录
      // this.triggerEvent('close');
    },

    /**
     * 获取用户信息授权（使用 getUserProfile）
     */
    onGetUserProfile() {
      const that = this;

      // 检查是否支持 getUserProfile
      if (!wx.getUserProfile) {
        wx.showModal({
          title: '提示',
          content: '您的微信版本不支持，请升级微信版本',
          showCancel: false
        });
        return;
      }

      // 调用 getUserProfile 获取用户信息
      wx.getUserProfile({
        desc: '用于完善用户资料', // 必填，向用户说明需要获取的信息
        success: (profileRes) => {
          console.log('获取用户信息成功:', profileRes);

          if (profileRes.userInfo) {
            that.setData({
              userInfo: profileRes.userInfo
            });

            // 获取登录code
            that.doWechatLogin(profileRes.userInfo);
          }
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err);

          if (err.errMsg.includes('cancel')) {
            wx.showToast({
              title: '您取消了授权',
              icon: 'none'
            });
          } else {
            wx.showModal({
              title: '授权失败',
              content: err.errMsg || '获取用户信息失败，请重试',
              showCancel: false
            });
          }
        }
      });
    },

    /**
     * 执行微信登录
     */
    doWechatLogin(userInfo) {
      const that = this;

      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      // 获取登录code
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            console.log('[登录模态框] 获取到登录code:', loginRes.code);

            // 调用后端登录接口
            api.miniprogramLogin(loginRes.code)
              .then(res => {
                wx.hideLoading();

                console.log('[登录模态框] 登录成功:', res);

                // 保存token和用户信息（注意：request.js 已经解包了 data）
                const token = res.token;
                const user = res.user;

                if (!token || !user) {
                  throw new Error('登录返回数据格式错误');
                }

                storage.setToken(token);

                // 使用后端返回的用户信息
                storage.setUserInfo(user);

                // 更新全局用户信息
                app.globalData.userInfo = user;
                app.globalData.token = token;

                wx.showToast({
                  title: '登录成功',
                  icon: 'success',
                  duration: 1500
                });

                // 触发登录成功事件
                that.triggerEvent('loginSuccess', {
                  user: user,
                  token: token
                });

                // 关闭模态框
                that.closeModal();
              })
              .catch(error => {
                wx.hideLoading();
                console.error('[登录模态框] 登录失败:', error);

                wx.showModal({
                  title: '登录失败',
                  content: error.error || error.message || '请重试',
                  showCancel: false
                });
              });
          } else {
            wx.hideLoading();
            wx.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            });
          }
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('[登录模态框] wx.login失败:', error);

          wx.showToast({
            title: '微信登录失败',
            icon: 'none'
          });
        }
      });
    }
  }
});
