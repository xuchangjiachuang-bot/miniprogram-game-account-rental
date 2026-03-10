'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MoreVertical, Users, Phone, Video, MoreHorizontal, Smile, Paperclip } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { getGroupMessages, type ChatMessage, type ChatGroup } from '@/lib/chat-service';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ChatWindowProps {
  group: ChatGroup;
  onClose?: () => void;
}

export function ChatWindow({ group, onClose }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // 加载历史消息
  const loadMessages = async () => {
    try {
      const data = await getGroupMessages(group.id, 50);
      setMessages(data.reverse());
      scrollToBottom();
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('message:send', {
        groupId: group.id,
        userId: user.id,
        messageType: 'text',
        content: newMessage.trim()
      });

      setNewMessage('');
      scrollToBottom();
    } else {
      toast.error('连接断开，请刷新页面');
    }
  };

  // 输入处理
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (socketRef.current && socketConnected) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        socketRef.current.emit('typing:start', {
          groupId: group.id,
          userId: user?.id
        });
      } else if (!value.trim() && isTyping) {
        setIsTyping(false);
        socketRef.current.emit('typing:stop', {
          groupId: group.id,
          userId: user?.id
        });
      }
    }
  };

  // 初始化 Socket 连接
  useEffect(() => {
    if (!user) return;

    // 动态导入 socket.io-client
    import('socket.io-client').then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      // 连接成功
      socket.on('connect', () => {
        console.log('Socket 连接成功');
        setSocketConnected(true);

        // 用户登录
        socket.emit('user:login', {
          userId: user.id,
          username: user.username,
          nickname: user.username,
          avatar: user.avatar
        });

        // 加入群聊
        socket.emit('group:join', {
          groupId: group.id,
          userId: user.id
        });
      });

      // 接收新消息
      socket.on('message:receive', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      });

      // 用户输入中
      socket.on('typing:status', (data: { groupId: string; user: any; isTyping: boolean }) => {
        if (data.groupId === group.id) {
          setTypingUsers(prev => {
            if (data.isTyping) {
              if (!prev.find(u => u.id === data.user.id)) {
                return [...prev, data.user];
              }
            } else {
              return prev.filter(u => u.id !== data.user.id);
            }
            return prev;
          });
        }
      });

      // 用户加入群聊
      socket.on('group:user:joined', (data: { groupId: string; user: any }) => {
        if (data.groupId === group.id) {
          toast.success(`${data.user.nickname || data.user.username} 加入了群聊`);
        }
      });

      // 用户离开群聊
      socket.on('group:user:left', (data: { groupId: string; user: any }) => {
        if (data.groupId === group.id) {
          toast.info(`${data.user.nickname || data.user.username} 离开了群聊`);
        }
      });

      // 消息已读
      socket.on('message:read:receipt', (data: { groupId: string; messageId: string; readBy: string }) => {
        // 可以在这里标记消息为已读
        console.log('消息已读:', data);
      });

      // 连接断开
      socket.on('disconnect', () => {
        console.log('Socket 连接断开');
        setSocketConnected(false);
      });

      // 错误处理
      socket.on('error', (error: any) => {
        console.error('Socket 错误:', error);
        toast.error(error.message || '连接错误');
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, group.id]);

  // 初始加载消息
  useEffect(() => {
    loadMessages();
  }, [group.id]);

  // 格式化时间
  const formatTime = (time: string) => {
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true, locale: zhCN });
    } catch {
      return '';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b flex flex-row items-center justify-between space-y-0 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{group.title.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg font-normal">{group.title}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{socketConnected ? '在线' : '离线'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Users className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>暂无消息，开始聊天吧！</p>
            </div>
          )}

          {messages.map((message) => {
            const isSelf = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.sender?.avatar} />
                  <AvatarFallback>
                    {message.sender?.nickname?.slice(0, 1) || message.sender?.username?.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  {!isSelf && (
                    <span className="text-xs text-gray-500 mb-1">
                      {message.sender?.nickname || message.sender?.username}
                    </span>
                  )}
                  <div className={`rounded-lg px-3 py-2 ${
                    isSelf
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.messageType === 'image' ? (
                      <img
                        src={message.content}
                        alt="图片"
                        className="max-w-full rounded"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="text-xs text-gray-500">
              {typingUsers.map(u => u.nickname || u.username).join(', ')} 正在输入...
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={!socketConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !socketConnected}
            className="h-10 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
