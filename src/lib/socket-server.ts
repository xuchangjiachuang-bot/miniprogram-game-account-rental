/**
 * Socket 服务器
 * 处理实时通讯
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getMessage, getGroupMembers, sendMessage, getUserGroups } from './chat-service-new';
import { getUserById } from './user-service';
import { isUserInGroup } from './chat-service-new';

let io: SocketIOServer | null = null;

interface SocketUser {
  userId: string;
  username: string;
  nickname: string;
  avatar?: string;
  socketId: string;
}

const onlineUsers = new Map<string, SocketUser>();

/**
 * 初始化 Socket 服务器
 */
export function initSocketServer(httpServer: HTTPServer) {
  if (io) {
    console.log('Socket 服务器已初始化');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6 // 1MB
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 用户登录
    socket.on('user:login', async (data: { userId: string; username: string; nickname: string; avatar?: string }) => {
      const { userId, username, nickname, avatar } = data;

      // 保存用户信息
      onlineUsers.set(userId, {
        userId,
        username,
        nickname,
        avatar,
        socketId: socket.id
      });

      // 加入用户房间（用于点对点消息）
      socket.join(`user:${userId}`);

      // 获取用户的群聊列表
      try {
        const groups = await getUserGroups(userId);

        // 加入所有群聊房间
        groups.forEach(group => {
          socket.join(`group:${group.id}`);
        });

        console.log(`用户 ${username} 已登录，加入 ${groups.length} 个群聊`);
      } catch (error) {
        console.error('获取用户群聊列表失败:', error);
      }

      // 通知其他用户该用户上线
      socket.broadcast.emit('user:online', {
        userId,
        username,
        nickname,
        avatar
      });
    });

    // 加入群聊
    socket.on('group:join', async (data: { groupId: string; userId: string }) => {
      const { groupId, userId } = data;

      // 检查用户是否在群聊中
      const isInGroup = await isUserInGroup(groupId, userId);
      if (!isInGroup) {
        socket.emit('error', { message: '您不在该群聊中' });
        return;
      }

      // 加入群聊房间
      socket.join(`group:${groupId}`);

      // 获取群聊成员信息
      const user = onlineUsers.get(userId);
      if (user) {
        // 通知群内其他用户有新成员加入
        socket.to(`group:${groupId}`).emit('group:user:joined', {
          groupId,
          user
        });
      }

      console.log(`用户 ${userId} 加入群聊 ${groupId}`);
    });

    // 离开群聊
    socket.on('group:leave', async (data: { groupId: string; userId: string }) => {
      const { groupId, userId } = data;

      // 离开群聊房间
      socket.leave(`group:${groupId}`);

      // 获取用户信息
      const user = onlineUsers.get(userId);
      if (user) {
        // 通知群内其他用户有成员离开
        socket.to(`group:${groupId}`).emit('group:user:left', {
          groupId,
          user
        });
      }

      console.log(`用户 ${userId} 离开群聊 ${groupId}`);
    });

    // 发送消息
    socket.on('message:send', async (data: {
      groupChatId: string;
      userId: string;
      messageType?: 'text' | 'image' | 'system';
      content?: string;
    }) => {
      const { groupChatId, userId, messageType, content } = data;

      try {
        // 保存消息到数据库
        const message = await sendMessage({
          groupChatId: groupChatId,
          userId: userId,
          messageType: messageType,
          content: content || ''
        });

        if (!message) {
          socket.emit('error', { message: '发送消息失败' });
          return;
        }

        // 获取发送者信息
        const sender = await getUserById(userId);
        const messageWithSender = {
          ...message,
          sender: sender ? {
            id: sender.id,
            username: sender.username,
            avatar: sender.avatar
          } : undefined
        };

        // 广播消息给群内所有用户
        io!.to(`group:${groupChatId}`).emit('message:receive', messageWithSender);

        console.log(`用户 ${userId} 在群聊 ${groupChatId} 发送消息`);
      } catch (error) {
        console.error('发送消息失败:', error);
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 输入中提示
    socket.on('typing:start', (data: { groupId: string; userId: string }) => {
      const { groupId, userId } = data;
      const user = onlineUsers.get(userId);

      if (user) {
        socket.to(`group:${groupId}`).emit('typing:status', {
          groupId,
          user,
          isTyping: true
        });
      }
    });

    // 停止输入
    socket.on('typing:stop', (data: { groupId: string; userId: string }) => {
      const { groupId, userId } = data;
      const user = onlineUsers.get(userId);

      if (user) {
        socket.to(`group:${groupId}`).emit('typing:status', {
          groupId,
          user,
          isTyping: false
        });
      }
    });

    // 消息已读
    socket.on('message:read', async (data: { groupId: string; userId: string; messageId: string }) => {
      // 通知发送者消息已读
      const message = await getMessage(data.messageId);
      if (message) {
        io!.to(`user:${message.senderId}`).emit('message:read:receipt', {
          groupId: data.groupId,
          messageId: data.messageId,
          readBy: data.userId
        });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);

      // 查找并移除在线用户
      let disconnectedUser: SocketUser | undefined;
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          disconnectedUser = user;
          onlineUsers.delete(userId);
          break;
        }
      }

      // 通知其他用户该用户下线
      if (disconnectedUser) {
        io!.emit('user:offline', {
          userId: disconnectedUser.userId,
          username: disconnectedUser.username,
          nickname: disconnectedUser.nickname
        });
      }
    });
  });

  console.log('Socket 服务器已初始化');
  return io;
}

/**
 * 获取 Socket 服务器实例
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * 获取在线用户列表
 */
export function getOnlineUsers(): SocketUser[] {
  return Array.from(onlineUsers.values());
}

/**
 * 检查用户是否在线
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * 向指定用户发送消息
 */
export function sendToUser(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * 向群聊发送消息
 */
export function sendToGroup(groupId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event, data);
}
