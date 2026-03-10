// pages/chat/detail/index.js
const api = require('../../../utils/api.js');
const chat = require('../../../utils/chat.js');
const storage = require('../../../utils/storage.js');

Page({
  data: {
    groupId: null,
    group: {},
    order: null,
    messages: [],
    inputText: '',
    scrollIntoView: '',
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    socketConnected: false
  },

  onLoad(options) {
    console.log('聊天详情页面加载', options);
    
    if (!options.groupId) {
      wx.showToast({
        title: '群组ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
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

  /**
   * 加载数据
   */
  loadData() {
    Promise.all([
      this.loadGroupInfo(),
      this.loadMessages()
    ]).catch(error => {
      console.error('加载数据失败:', error);
    });
  },

  /**
   * 加载群组信息
   */
  loadGroupInfo() {
    const that = this;
    
    return api.getChatGroupDetail(that.data.groupId)
      .then(res => {
        that.setData({
          group: res.data.group,
          order: res.data.order || null
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: res.data.group.name
        });
      });
  },

  /**
   * 加载消息列表
   */
  loadMessages() {
    const that = this;
    
    if (that.data.loadingMore || !that.data.hasMore) {
      return Promise.resolve();
    }
    
    that.setData({ loadingMore: true });
    
    return api.getChatMessages(that.data.groupId, {
      page: that.data.page,
      pageSize: that.data.pageSize
    })
    .then(res => {
      const messages = res.data.list.map((msg, index) => {
        return {
          ...msg,
          isSelf: msg.senderId === storage.getUserId(),
          showTime: index === 0 || that.shouldShowTime(msg, res.data.list[index - 1])
        };
      });
      
      const hasMore = res.data.list.length >= that.data.pageSize;
      
      that.setData({
        messages: messages,
        hasMore,
        loadingMore: false
      });
      
      // 滚动到底部
      that.scrollToBottom();
    })
    .catch(error => {
      console.error('加载消息失败:', error);
      that.setData({ loadingMore: false });
    });
  },

  /**
   * 判断是否显示时间
   */
  shouldShowTime(current, prev) {
    if (!prev) return true;
    
    const currentTime = new Date(current.createdAt).getTime();
    const prevTime = new Date(prev.createdAt).getTime();
    const diff = currentTime - prevTime;
    
    return diff > 5 * 60 * 1000; // 5分钟
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    const messages = this.data.messages;
    
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      this.setData({
        scrollIntoView: `msg-${lastMessage.id}`
      });
    }
  },

  /**
   * 连接Socket
   */
  connectSocket() {
    const that = this;
    
    if (that.data.socketConnected) {
      return;
    }
    
    chat.connect()
      .then(() => {
        that.setData({ socketConnected: true });
        
        // 加入群组
        chat.emit('join-group', {
          groupId: that.data.groupId
        });
        
        // 监听新消息
        chat.on('new-message', that.handleNewMessage.bind(that));
      })
      .catch(error => {
        console.error('Socket连接失败:', error);
      });
  },

  /**
   * 断开Socket
   */
  disconnectSocket() {
    const that = this;
    
    if (!that.data.socketConnected) {
      return;
    }
    
    // 离开群组
    chat.emit('leave-group', {
      groupId: that.data.groupId
    });
    
    // 移除监听
    chat.off('new-message', that.handleNewMessage.bind(that));
    
    that.setData({ socketConnected: false });
  },

  /**
   * 处理新消息
   */
  handleNewMessage(data) {
    const that = this;
    
    if (data.groupId !== that.data.groupId) {
      return;
    }
    
    const messages = that.data.messages;
    const lastMessage = messages[messages.length - 1];
    
    const newMessage = {
      ...data,
      isSelf: data.senderId === storage.getUserId(),
      showTime: that.shouldShowTime(data, lastMessage)
    };
    
    that.setData({
      messages: [...messages, newMessage]
    });
    
    // 滚动到底部
    that.scrollToBottom();
  },

  /**
   * 输入框输入
   */
  onInputInput(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  onSend() {
    const that = this;
    
    const content = that.data.inputText.trim();
    
    if (!content) {
      return;
    }
    
    // 发送消息
    chat.emit('send-message', {
      groupId: that.data.groupId,
      type: 'text',
      content
    });
    
    that.setData({
      inputText: ''
    });
  },

  /**
   * 查看订单
   */
  onViewOrder() {
    if (this.data.order) {
      wx.navigateTo({
        url: `/pages/order/detail/index?id=${this.data.order.id}`
      });
    }
  },

  /**
   * 查看成员
   */
  onViewMembers() {
    wx.showToast({
      title: '成员列表开发中',
      icon: 'none'
    });
  }
});
