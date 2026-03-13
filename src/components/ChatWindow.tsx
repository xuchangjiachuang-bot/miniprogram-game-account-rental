'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getGroupMessages, sendGroupMessage, type ChatGroup, type ChatMessage } from '@/lib/chat-service';

interface ChatWindowProps {
  group: ChatGroup;
  onClose?: () => void;
}

export function ChatWindow({ group, onClose }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => group.orderTitle || '订单群聊', [group.orderTitle]);

  const scrollToBottom = () => {
    window.setTimeout(() => {
      const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }, 0);
  };

  const loadMessages = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }

      const data = await getGroupMessages(group.id, 100);
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error('加载聊天消息失败:', error);
      if (!options?.silent) {
        toast.error('加载聊天消息失败');
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMessages();

    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [group.id]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) {
      return;
    }

    try {
      setSending(true);
      const message = await sendGroupMessage(group.id, content);
      setMessages((current) => [...current, message]);
      setNewMessage('');
      scrollToBottom();
    } catch (error: any) {
      console.error('发送群聊消息失败:', error);
      toast.error(error?.message || '发送群聊消息失败');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (value: string) => {
    if (!value) {
      return '';
    }

    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true, locale: zhCN });
    } catch {
      return '';
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b py-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-lg font-medium">{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            下单后自动创建，仅订单买卖双方可见
          </p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        ) : null}
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            正在加载聊天消息...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-50" />
            <p>暂无消息，开始沟通订单细节吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isSelf = message.senderId === user?.id;
              const isSystem = message.senderType === 'system';

              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isSelf ? (
                      <span className="mb-1 text-xs text-muted-foreground">{message.senderName}</span>
                    ) : null}
                    <div
                      className={
                        isSelf
                          ? 'rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground'
                          : 'rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm text-foreground'
                      }
                    >
                      {message.content}
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="输入消息，和订单另一方沟通"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button onClick={() => void handleSend()} disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
