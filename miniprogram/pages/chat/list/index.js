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

function buildMockGroups() {
  const mockData = require('../../../utils/mock-data.js');
  return (mockData.chatList || []).map((chatItem) => normalizeGroup({
    id: chatItem.id,
    name: chatItem.targetUser && chatItem.targetUser.nickname,
    avatar: chatItem.targetUser && chatItem.targetUser.avatar,
    lastMessage: chatItem.lastMessage,
    lastMessageTime: Date.now() - 3600000,
    unreadCount: chatItem.unreadCount,
  }));
}

Page({
  data: {
    searchKeyword: '',
    chatGroups: [],
    allChatGroups: [],
    loading: false,
    errorText: '',
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
    this.setData({ loading: true, errorText: '' });
    return api.getChatGroups()
      .then((res) => {
        const list = res && res.data ? (res.data.list || []) : [];
        const normalized = list.map(normalizeGroup);
        this.setData({
          allChatGroups: normalized,
          chatGroups: this.filterGroups(normalized, this.data.searchKeyword),
          loading: false,
          errorText: '',
        });
      })
      .catch((error) => {
        console.error('加载聊天列表失败:', error);
        if (config.useMockData) {
          const normalized = buildMockGroups();
          this.setData({
            allChatGroups: normalized,
            chatGroups: this.filterGroups(normalized, this.data.searchKeyword),
            loading: false,
            errorText: '',
          });
          return;
        }

        this.setData({
          loading: false,
          errorText: error && error.error ? error.error : '聊天列表加载失败，请稍后重试。',
        });
      });
  },

  filterGroups(groups, keyword) {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    if (!normalizedKeyword) {
      return groups;
    }

    return groups.filter((group) => {
      return String(group.name || '').toLowerCase().includes(normalizedKeyword)
        || String(group.lastMessage || '').toLowerCase().includes(normalizedKeyword);
    });
  },

  onSearchInput(e) {
    const keyword = (e.detail.value || '').trim();
    this.setData({
      searchKeyword: keyword,
      chatGroups: this.filterGroups(this.data.allChatGroups, keyword),
    });
  },

  onRetry() {
    this.loadChatGroups();
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
