// pages/chat/list/index.js
const api = require('../../../utils/api.js');
const chat = require('../../../utils/chat.js');

Page({
  data: {
    searchKeyword: '',
    chatGroups: [],
    loading: false
  },

  onLoad() {
    console.log('聊天列表页面加载');
    this.loadChatGroups();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadChatGroups();
  },

  onPullDownRefresh() {
    this.loadChatGroups().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载聊天群组列表
   */
  loadChatGroups() {
    const that = this;
    
    that.setData({ loading: true });
    
    api.getChatGroups()
      .then(res => {
        const { data } = res;
        const chatGroups = data.list || [];
        
        // 处理聊天群组数据
        const processedGroups = chatGroups.map(group => {
          return {
            ...group,
            lastTime: that.formatTime(group.lastMessageTime),
            lastMessageType: group.lastMessageType || 'text'
          };
        });
        
        that.setData({
          chatGroups: processedGroups,
          loading: false
        });
      })
      .catch(error => {
        console.error('加载聊天列表失败:', error);
        that.setData({ loading: false });
      });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    // 实时搜索
    this.searchChatGroups(keyword);
  },

  /**
   * 搜索聊天群组
   */
  searchChatGroups(keyword) {
    if (!keyword) {
      this.loadChatGroups();
      return;
    }
    
    const filteredGroups = this.data.chatGroups.filter(group => {
      return group.name.toLowerCase().includes(keyword.toLowerCase()) ||
             group.lastMessage.toLowerCase().includes(keyword.toLowerCase());
    });
    
    this.setData({ chatGroups: filteredGroups });
  },

  /**
   * 点击聊天
   */
  onChatTap(e) {
    const { group } = e.currentTarget.dataset;
    
    // 清除未读消息
    if (group.unreadCount > 0) {
      this.clearUnread(group.id);
    }
    
    wx.navigateTo({
      url: `/pages/chat/detail/index?groupId=${group.id}`
    });
  },

  /**
   * 清除未读消息
   */
  clearUnread(groupId) {
    api.clearUnreadMessages(groupId)
      .then(() => {
        // 更新本地数据
        const chatGroups = this.data.chatGroups.map(g => {
          if (g.id === groupId) {
            return { ...g, unreadCount: 0 };
          }
          return g;
        });
        this.setData({ chatGroups });
      })
      .catch(error => {
        console.error('清除未读消息失败:', error);
      });
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 一天内
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()];
    }
    
    // 超过一周
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
});
