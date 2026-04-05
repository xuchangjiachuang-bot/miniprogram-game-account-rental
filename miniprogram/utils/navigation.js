function goToFallback(url, type) {
  if (!url) return;

  const actionMap = {
    switchTab: wx.switchTab,
    redirectTo: wx.redirectTo,
    navigateTo: wx.navigateTo,
    reLaunch: wx.reLaunch,
  };

  const navigate = actionMap[type] || wx.reLaunch;
  navigate({
    url,
    fail() {
      if (navigate !== wx.reLaunch) {
        wx.reLaunch({ url });
      }
    },
  });
}

function safeNavigateBack(options = {}) {
  const {
    delta = 1,
    fallbackUrl = '/pages/index/index',
    fallbackType = 'reLaunch',
  } = options;

  const pages = getCurrentPages();
  if (pages.length > delta) {
    wx.navigateBack({
      delta,
      fail() {
        goToFallback(fallbackUrl, fallbackType);
      },
    });
    return;
  }

  goToFallback(fallbackUrl, fallbackType);
}

module.exports = {
  goToFallback,
  safeNavigateBack,
};