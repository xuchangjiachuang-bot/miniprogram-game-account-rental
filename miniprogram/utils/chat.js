// utils/chat.js
const config = require('./config.js');
const storage = require('./storage.js');

class ChatClient {
  constructor() {
    this.ws = null;
    this.wsUrl = config.wsUrl;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.errorHandlers = [];
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 30000; // 30秒心跳
  }

  /**
   * 连接WebSocket
   */
  connect() {
    if (this.ws) {
      console.log('WebSocket已连接');
      return;
    }

    const token = storage.getToken();
    if (!token) {
      console.error('未登录，无法连接WebSocket');
      return;
    }

    // 构建WebSocket URL
    const url = `${this.wsUrl}?token=${token}`;

    console.log('连接WebSocket:', url);

    this.ws = wx.connectSocket({
      url,
      header: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 监听连接打开
    this.ws.onOpen(() => {
      console.log('WebSocket连接成功');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 触发连接处理器
      this.triggerConnectionHandlers(true);
      
      // 开始心跳
      this.startHeartbeat();
    });

    // 监听消息
    this.ws.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        console.log('收到消息:', data);
        
        // 触发消息处理器
        this.triggerMessageHandlers(data);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });

    // 监听错误
    this.ws.onError((error) => {
      console.error('WebSocket错误:', error);
      this.isConnected = false;
      
      // 触发错误处理器
      this.triggerErrorHandlers(error);
      
      // 停止心跳
      this.stopHeartbeat();
    });

    // 监听关闭
    this.ws.onClose(() => {
      console.log('WebSocket连接关闭');
      this.isConnected = false;
      this.ws = null;
      
      // 触发连接处理器
      this.triggerConnectionHandlers(false);
      
      // 停止心跳
      this.stopHeartbeat();
      
      // 自动重连
      this.autoReconnect();
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      console.log('WebSocket已断开');
    }
  }

  /**
   * 自动重连
   */
  autoReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('重连次数已达上限');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * 开始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
      }
    }, this.heartbeatTimeout);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 发送消息
   */
  send(data) {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket未连接');
      return false;
    }

    try {
      this.ws.send({
        data: JSON.stringify(data)
      });
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  /**
   * 发送文本消息
   */
  sendTextMessage(groupId, content) {
    return this.send({
      type: 'message',
      groupId,
      messageType: 'text',
      content
    });
  }

  /**
   * 发送图片消息
   */
  sendImageMessage(groupId, imageUrl) {
    return this.send({
      type: 'message',
      groupId,
      messageType: 'image',
      content: imageUrl
    });
  }

  /**
   * 加入群组
   */
  joinGroup(groupId) {
    return this.send({
      type: 'join_group',
      groupId
    });
  }

  /**
   * 离开群组
   */
  leaveGroup(groupId) {
    return this.send({
      type: 'leave_group',
      groupId
    });
  }

  /**
   * 添加消息处理器
   */
  onMessage(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.push(handler);
    }
  }

  /**
   * 移除消息处理器
   */
  offMessage(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 触发消息处理器
   */
  triggerMessageHandlers(data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('消息处理器执行失败:', error);
      }
    });
  }

  /**
   * 添加连接状态处理器
   */
  onConnection(handler) {
    if (typeof handler === 'function') {
      this.connectionHandlers.push(handler);
    }
  }

  /**
   * 移除连接状态处理器
   */
  offConnection(handler) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * 触发连接状态处理器
   */
  triggerConnectionHandlers(connected) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('连接状态处理器执行失败:', error);
      }
    });
  }

  /**
   * 添加错误处理器
   */
  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.push(handler);
    }
  }

  /**
   * 移除错误处理器
   */
  offError(handler) {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 触发错误处理器
   */
  triggerErrorHandlers(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('错误处理器执行失败:', err);
      }
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// 实例化
const chatClient = new ChatClient();

module.exports = chatClient;
