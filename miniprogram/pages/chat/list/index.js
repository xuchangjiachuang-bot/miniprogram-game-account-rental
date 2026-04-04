const api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  }
  return (date.getMonth() + 1) + '/' + date.getDate();
}

function normalizeGroup(group) {
  const order = group.order || {};
  const lastMessageType = group.lastMessageType || 'text';
  const lastMessage = group.lastMessage || '';
  return {
    id: group.id,
    name: group.name || group.nickname || '聊天会话',
    avatar: group.avatar || '/images/default-avatar.png',
    unreadCount: Number(group.unreadCount || 0),
    lastTime: formatTime(group.lastMessageTime || group.updatedAt),
    lastMessage,
    lastMessageType,
    lastMessagePreview: lastMessageType === 'image'
      ? '[图片]'
      : lastMessageType === 'system'
        ? '[系统消息]'
        : (lastMessage || '点击进入对话'),
    statusText: order.statusText || '',
  };
}

Page({
  data: {
    searchKeyword: '',
    chatGroups: [],
    allChatGroups: [],
    loading: false,
  },

  onLoad() {
    this.loadChatGroups();
  },

  onShow() {
    this.loadChatGroups();
  },

  onPullDownRefresh() {
    this.loadChatGroups().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadChatGroups() {
    this.setData({ loading: true });
    return api.getChatGroups()
      .then((res) => {
        const list = res && res.data ? (res.data.list || []) : [];
        const normalized = list.map(normalizeGroup);
        this.setData({
          allChatGroups: normalized,
          chatGroups: normalized,
          loading: false,
        });
      })
      .catch((error) => {
        console.error('加载聊天列表失败:', error);
        if (config.useMockData) {
          const mockData = require('../../../utils/mock-data.js');
          const normalized = (mockData.chatList || []).map((chatItem) => normalizeGroup({
            id: chatItem.id,
            name: chatItem.targetUser && chatItem.targetUser.nickname,
            avatar: chatItem.targetUser && chatItem.targetUser.avatar,
            lastMessage: chatItem.lastMessage,
            lastMessageTime: Date.now() - 3600000,
            unreadCount: chatItem.unreadCount,
          }));
          this.setData({
            allChatGroups: normalized,
            chatGroups: normalized,
            loading: false,
          });
          return;
        }
        this.setData({ loading: false });
      });
  },

  onSearchInput(e) {
    const keyword = (e.detail.value || '').trim();
    const lowerKeyword = keyword.toLowerCase();
    const chatGroups = keyword
      ? this.data.allChatGroups.filter((group) => {
        return String(group.name || '').toLowerCase().includes(lowerKeyword)
          || String(group.lastMessage || '').toLowerCase().includes(lowerKeyword);
      })
      : this.data.allChatGroups;

    this.setData({
      searchKeyword: keyword,
      chatGroups,
    });
  },

  onChatTap(e) {
    const id = e.currentTarget.dataset.id;
    const group = this.data.chatGroups.find((item) => item.id === id);
    if (!group) return;

    if (group.unreadCount > 0) {
      this.clearUnread(id);
    }

    wx.navigateTo({
      url: '/pages/chat/detail/index?groupId=' + id,
    });
  },

  clearUnread(groupId) {
    const updateList = (list) => list.map((item) => (
      item.id === groupId ? { ...item, unreadCount: 0 } : item
    ));

    this.setData({
      allChatGroups: updateList(this.data.allChatGroups),
      chatGroups: updateList(this.data.chatGroups),
    });

    api.clearUnreadMessages(groupId).catch((error) => {
      console.error('清除未读消息失败:', error);
    });
  },
});
