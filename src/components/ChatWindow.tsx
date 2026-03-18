'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatServerDateTime } from '@/lib/time';
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
  onMessageSent?: () => void;
}

const MAX_CHAT_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_CHAT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function formatBeijingTime(value: string) {
  return formatServerDateTime(value);
}

export function ChatWindow({ group, onClose, onMessageSent }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const title = useMemo(() => group.orderTitle || '订单群聊', [group.orderTitle]);

  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
    };
  }, [pendingImagePreview]);

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
      if (document.visibilityState === 'visible') {
        void loadMessages({ silent: true });
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [group.id]);

  const validateImageFile = (file: File) => {
    if (!ACCEPTED_CHAT_IMAGE_TYPES.includes(file.type)) {
      throw new Error('仅支持 JPG、PNG、WEBP 图片');
    }

    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      throw new Error('图片不能超过 3MB');
    }
  };

  const setPendingImage = (file: File) => {
    validateImageFile(file);

    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }

    setPendingImageFile(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }

    setPendingImageFile(null);
    setPendingImagePreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    const hasPendingImage = Boolean(pendingImageFile);

    if ((!content && !hasPendingImage) || sending || uploadingImage) {
      return;
    }

    try {
      setSending(true);

      if (pendingImageFile) {
        setUploadingImage(true);
        const imageMessage = await sendGroupImageMessage(group.id, pendingImageFile);
        setMessages((current) => [...current, imageMessage]);
        clearPendingImage();
        setUploadingImage(false);
      }

      if (content) {
        const textMessage = await sendGroupMessage(group.id, content);
        setMessages((current) => [...current, textMessage]);
        setNewMessage('');
      }

      await loadMessages({ silent: true });
      onMessageSent?.();
      scrollToBottom();
    } catch (error: any) {
      console.error('发送群聊消息失败:', error);
      toast.error(error?.message || '发送群聊消息失败');
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setPendingImage(file);
      toast.success('图片已加入待发送区域');
    } catch (error: any) {
      toast.error(error?.message || '图片处理失败');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const item = Array.from(event.clipboardData.items).find((clipboardItem) => clipboardItem.type.startsWith('image/'));
    if (!item) {
      return;
    }

    const file = item.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();

    try {
      setPendingImage(file);
      toast.success('截图已加入待发送区域，请点击发送');
    } catch (error: any) {
      toast.error(error?.message || '图片处理失败');
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b py-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-lg font-medium">{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">买卖双方可在这里沟通交易、使用、验号和售后问题。</p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        ) : null}
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载聊天消息...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-50" />
            <p>暂无消息，先开始沟通吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isSelf = message.senderId === user?.id;
              const isSystem = message.senderType === 'system';

              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{message.content}</div>
                  </div>
                );
              }

              return (
                <div key={message.id} className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className={`flex max-w-[75%] flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                    {!isSelf ? <span className="mb-1 text-xs text-muted-foreground">{message.senderName}</span> : null}
                    <div
                      className={
                        isSelf
                          ? 'rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground'
                          : 'rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm text-foreground'
                      }
                    >
                      {message.messageType === 'image' ? (
                        <a href={message.imageUrl || '#'} target="_blank" rel="noreferrer">
                          <img
                            src={message.imageUrl}
                            alt="聊天图片"
                            className="max-h-72 max-w-full rounded-lg object-contain"
                          />
                        </a>
                      ) : (
                        message.content
                      )}
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">{formatBeijingTime(message.createdAt)}</span>
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

        {pendingImagePreview ? (
          <div className="mb-3 rounded-xl border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>待发送图片</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={clearPendingImage}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <img src={pendingImagePreview} alt="待发送图片预览" className="max-h-40 rounded-lg object-contain" />
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onPaste={(event) => void handlePaste(event)}
            placeholder="输入消息，或粘贴截图后点击发送"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage}>
            {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
          <Button onClick={() => void handleSend()} disabled={(!newMessage.trim() && !pendingImageFile) || sending || uploadingImage}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">支持 JPG、PNG、WEBP，最大 3MB。截图粘贴后会先进入待发送区域。</p>
      </div>
    </Card>
  );
}
