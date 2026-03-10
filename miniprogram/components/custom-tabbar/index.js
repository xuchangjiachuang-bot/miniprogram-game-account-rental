// components/custom-tabbar/index.js
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        iconPath: "/images/icons/home.png",
        selectedIconPath: "/images/icons/home-active.png",
        text: "首页"
      },
      {
        pagePath: "/pages/orders/list/index",
        iconPath: "/images/icons/order.png",
        selectedIconPath: "/images/icons/order-active.png",
        text: "订单"
      },
      {
        pagePath: "/pages/chat/list/index",
        iconPath: "/images/icons/chat.png",
        selectedIconPath: "/images/icons/chat-active.png",
        text: "消息"
      },
      {
        pagePath: "/pages/profile/index/index",
        iconPath: "/images/icons/profile.png",
        selectedIconPath: "/images/icons/profile-active.png",
        text: "我的"
      }
    ]
  },

  lifetimes: {
    attached() {
      this.updateSelected();
    }
  },

  pageLifetimes: {
    show() {
      this.updateSelected();
    }
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage ? currentPage.route : '';
      
      const selected = this.data.list.findIndex(item => item.pagePath === `/${route}`);
      
      if (selected !== -1) {
        this.setData({ selected });
      }
    },

    switchTab(e) {
      const { path } = e.currentTarget.dataset;
      const { index } = e.currentTarget.dataset;
      
      if (index === this.data.selected) {
        return;
      }
      
      wx.switchTab({
        url: path
      });
    }
  }
});
