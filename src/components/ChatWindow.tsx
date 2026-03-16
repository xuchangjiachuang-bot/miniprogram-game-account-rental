'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ImagePlus, Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getGroupMessages,
  sendGroupImageMessage,
  sendGroupMessage,
  type ChatGroup,
  type ChatMessage,
} from '@/lib/chat-service';

interface ChatWindowProps {
  group: ChatGroup;
  onClose?: () => void;
}

const MAX_CHAT_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_CHAT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ChatWindow({ group, onClose }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!content || sending || uploadingImage) {
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

  const validateImageFile = (file: File) => {
    if (!ACCEPTED_CHAT_IMAGE_TYPES.includes(file.type)) {
      throw new Error('仅支持 JPG、PNG、WEBP 图片');
    }

    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      throw new Error('图片不能超过 3MB');
    }
  };

  const handleSendImageFile = async (file: File) => {
    try {
      validateImageFile(file);
      setUploadingImage(true);
      const message = await sendGroupImageMessage(group.id, file);
      setMessages((current) => [...current, message]);
      scrollToBottom();
      toast.success('图片发送成功');
    } catch (error: any) {
      console.error('发送图片消息失败:', error);
      toast.error(error?.message || '发送图片消息失败');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleSendImageFile(file);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const item = Array.from(event.clipboardData.items).find((clipboardItem) =>
      clipboardItem.type.startsWith('image/'),
    );

    if (!item) {
      return;
    }

    const file = item.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    await handleSendImageFile(file);
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
            下单后自动创建，买家、卖家和平台客服都可以在这里沟通。
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
                      {message.messageType === 'image' ? (
                        <a href={message.content} target="_blank" rel="noreferrer">
                          <img
                            src={message.content}
                            alt="聊天图片"
                            className="max-h-72 max-w-full rounded-lg object-contain"
                          />
                        </a>
                      ) : (
                        message.content
                      )}
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
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_CHAT_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onPaste={(event) => void handlePaste(event)}
            placeholder="输入消息，或直接粘贴二维码截图发送"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingImage}
          >
            {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
          <Button onClick={() => void handleSend()} disabled={!newMessage.trim() || sending || uploadingImage}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          支持 JPG、PNG、WEBP，最大 3MB，也支持截图后直接粘贴发送。
        </p>
      </div>
    </Card>
  );
}
