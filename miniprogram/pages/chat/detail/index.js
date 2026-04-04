const api = require('../../../utils/api.js');
const chat = require('../../../utils/chat.js');
const storage = require('../../../utils/storage.js');
const config = require('../../../utils/config.js');

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return month + '-' + day + ' ' + hour + ':' + minute;
}

function getCurrentUserId() {
  const userInfo = storage.getUserInfo() || {};
  return userInfo.id || userInfo.userId || '';
}

function normalizeMessage(message, previousMessage) {
  const createdAt = message.createdAt || message.createTime || Date.now();
  const type = message.type || message.messageType || 'text';
  const senderId = message.senderId || message.sender_id || '';
  return {
    id: message.id || ('local-' + createdAt),
    type,
    content: message.content || '',
    createdAt,
    timeText: formatMessageTime(createdAt),
    isSelf: senderId && senderId === getCurrentUserId(),
    senderName: message.senderName || message.nickname || '用户',
    avatar: message.avatar || '/images/default-avatar.png',
    showTime: !previousMessage || (new Date(createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) > 5 * 60 * 1000,
  };
}

function normalizeMessageList(list) {
  const normalized = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const previous = normalized[normalized.length - 1];
    normalized.push(normalizeMessage(item, previous));
  });
  return normalized;
}

Page({
  data: {
    groupId: '',
    group: {
      name: '聊天会话',
      avatar: '/images/default-avatar.png',
      memberCount: 0,
      memberText: '正在同步成员信息',
    },
    order: null,
    messages: [],
    inputText: '',
    scrollIntoView: '',
    loadingMore: false,
    socketConnected: false,
  },

  onLoad(options) {
    if (!options.groupId) {
      wx.showToast({ title: '缺少会话信息', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.messageHandler = this.handleSocketMessage.bind(this);
    this.setData({ groupId: options.groupId });
    this.loadData();
  },

  onShow() {
    this.connectSocket();
  },

  onHide() {
    this.disconnectSocket();
  },

  onUnload() {
    this.disconnectSocket();
  },

  loadData() {
    return Promise.allSettled([
      this.loadGroupInfo(),
      this.loadMessages(),
    ]);
  },

  loadGroupInfo() {
    return api.getChatGroupDetail(this.data.groupId)
      .then((res) => {
        const data = res && res.data ? res.data : {};
        const group = data.group || {};
        const memberCount = Number(group.memberCount || group.members || 0);
        const groupData = {
          id: group.id || this.data.groupId,
          name: group.name || '聊天会话',
          avatar: group.avatar || '/images/default-avatar.png',
          memberCount,
          memberText: memberCount ? memberCount + ' 人正在会话' : '实时沟通中',
        };
        this.setData({
          group: groupData,
          order: data.order || null,
        });
        wx.setNavigationBarTitle({ title: groupData.name });
      })
      .catch((error) => {
        console.error('加载群组信息失败:', error);
        if (config.useMockData) {
          this.setData({
            group: {
              id: this.data.groupId,
              name: '聊天会话',
              avatar: '/images/default-avatar.png',
              memberCount: 2,
              memberText: '2 人正在会话',
            },
          });
        }
      });
  },

  loadMessages() {
    this.setData({ loadingMore: true });
    return api.getChatMessages(this.data.groupId, { page: 1, pageSize: 50 })
      .then((res) => {
        const list = res && res.data ? (res.data.list || []) : [];
        const messages = normalizeMessageList(list);
        this.setData({
          messages,
          loadingMore: false,
        });
        this.scrollToBottom();
      })
      .catch((error) => {
        console.error('加载消息失败:', error);
        if (config.useMockData) {
          const mockMessages = [
            { id: 'm1', senderId: 'seller', senderName: '卖家', content: '你好，账号已经准备好了。', createdAt: '2026-04-04 10:30:00' },
            { id: 'm2', senderId: getCurrentUserId(), senderName: '我', content: '好的，我先确认一下。', createdAt: '2026-04-04 10:40:00' },
          ];
          this.setData({
            messages: normalizeMessageList(mockMessages),
            loadingMore: false,
          });
          this.scrollToBottom();
          return;
        }
        this.setData({ loadingMore: false });
      });
  },

  connectSocket() {
    if (this.data.socketConnected) return;
    try {
      chat.onMessage(this.messageHandler);
      chat.connect();
      chat.joinGroup(this.data.groupId);
      this.setData({ socketConnected: true });
    } catch (error) {
      console.error('连接聊天服务失败:', error);
    }
  },

  disconnectSocket() {
    if (!this.data.socketConnected) return;
    try {
      chat.leaveGroup(this.data.groupId);
      chat.offMessage(this.messageHandler);
      chat.disconnect();
    } catch (error) {
      console.error('关闭聊天服务失败:', error);
    }
    this.setData({ socketConnected: false });
  },

  handleSocketMessage(data) {
    if (!data || data.groupId !== this.data.groupId) return;
    const messages = this.data.messages.slice();
    const previous = messages[messages.length - 1];
    const nextMessage = normalizeMessage(data, previous);
    messages.push(nextMessage);
    this.setData({ messages });
    this.scrollToBottom();
  },

  scrollToBottom() {
    const messages = this.data.messages;
    if (!messages.length) return;
    this.setData({
      scrollIntoView: 'msg-' + messages[messages.length - 1].id,
    });
  },

  onInputInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onSend() {
    const content = String(this.data.inputText || '').trim();
    if (!content) return;

    const optimisticMessage = normalizeMessage({
      id: 'local-' + Date.now(),
      senderId: getCurrentUserId(),
      senderName: '我',
      avatar: '/images/default-avatar.png',
      type: 'text',
      content,
      createdAt: Date.now(),
    }, this.data.messages[this.data.messages.length - 1]);

    this.setData({
      messages: this.data.messages.concat(optimisticMessage),
      inputText: '',
    });
    this.scrollToBottom();

    if (this.data.socketConnected) {
      const sent = chat.sendTextMessage(this.data.groupId, content);
      if (sent) return;
    }

    api.sendMessage(this.data.groupId, { type: 'text', content }).catch((error) => {
      console.error('发送消息失败:', error);
      wx.showToast({ title: '消息发送失败', icon: 'none' });
    });
  },

  onViewOrder() {
    if (!this.data.order || !this.data.order.id) {
      wx.showToast({ title: '当前会话暂无关联订单', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/order/detail/index?id=' + this.data.order.id,
    });
  },

  onViewMembers() {
    wx.showToast({
      title: '成员管理入口整理中',
      icon: 'none',
    });
  },
});
