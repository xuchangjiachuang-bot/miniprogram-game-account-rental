Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        iconPath: '/images/icons/home.png',
        selectedIconPath: '/images/icons/home-active.png',
        text: '首页',
        selected: true,
      },
      {
        pagePath: '/pages/order/list/index',
        iconPath: '/images/icons/order.png',
        selectedIconPath: '/images/icons/order-active.png',
        text: '订单',
        selected: false,
      },
      {
        pagePath: '/pages/chat/list/index',
        iconPath: '/images/icons/chat.png',
        selectedIconPath: '/images/icons/chat-active.png',
        text: '消息',
        selected: false,
      },
      {
        pagePath: '/pages/profile/index',
        iconPath: '/images/icons/profile.png',
        selectedIconPath: '/images/icons/profile-active.png',
        text: '我的',
        selected: false,
      },
    ],
  },

  lifetimes: {
    attached() {
      this.updateSelected();
    },
  },

  pageLifetimes: {
    show() {
      this.updateSelected();
    },
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage ? `/${currentPage.route}` : '';
      const selected = this.data.list.findIndex((item) => item.pagePath === route);
      const currentIndex = selected === -1 ? this.data.selected : selected;
      const list = this.data.list.map((item, index) => ({
        ...item,
        selected: index === currentIndex,
      }));

      this.setData({
        selected: currentIndex,
        list,
      });
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      if (index === this.data.selected) {
        return;
      }

      wx.switchTab({ url: path });
    },
  },
});
