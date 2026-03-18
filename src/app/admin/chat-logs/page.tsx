'use client';

import { type ClipboardEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, ImagePlus, Loader2, Search, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatServerDateTime } from '@/lib/time';

interface ChatMessage {
  id: string;
  sender: string;
  senderType: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  content: string;
  fileKey?: string;
  imageUrl?: string;
  messageType?: 'text' | 'image' | 'system';
  timestamp: string;
}

interface ChatDetailData {
  orderId: string;
  orderStatus: string;
  participants: {
    buyer: { id: string; name: string };
    seller: { id: string; name: string };
    admin: { id: string; name: string };
  };
  messages: ChatMessage[];
}

interface ChatGroup {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  createdAt: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  status: 'active' | 'completed' | 'disputed' | 'unknown';
}

interface SentChatMessageResponse {
  id: string;
  senderId?: string;
  senderType?: 'buyer' | 'seller' | 'admin' | 'system';
  senderName?: string;
  content?: string;
  fileKey?: string;
  imageUrl?: string;
  messageType?: 'text' | 'image' | 'system';
  createdAt?: string;
}

const MAX_CHAT_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_CHAT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getReadableChatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (!message) {
    return '发送消息失败';
  }

  if (message.includes('PERSISTENT_STORAGE_NOT_CONFIGURED')) {
    return '图片存储服务尚未配置完成，请稍后重试。';
  }

  if (message.includes('WECHAT_CLOUD_ENV_ID_MISSING')) {
    return '图片存储环境未配置完成，请稍后重试。';
  }

  if (message.includes('WECHAT_STORAGE')) {
    return '图片上传到云存储失败，请稍后重试。';
  }

  return message;
}

function formatDateTime(dateStr: string) {
  return formatServerDateTime(dateStr);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-violet-500">进行中</Badge>;
    case 'completed':
      return <Badge className="bg-emerald-500">已完成</Badge>;
    case 'disputed':
      return <Badge variant="destructive">争议中</Badge>;
    default:
      return <Badge variant="secondary">未知</Badge>;
  }
}

function getSenderRoleBadge(role: string) {
  switch (role) {
    case 'buyer':
      return <Badge className="bg-violet-500 text-xs">买家</Badge>;
    case 'seller':
      return <Badge className="bg-emerald-500 text-xs">卖家</Badge>;
    case 'admin':
      return <Badge className="bg-blue-500 text-xs">客服</Badge>;
    case 'system':
      return (
        <Badge variant="secondary" className="text-xs">
          系统
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          未知
        </Badge>
      );
  }
}

export default function AdminChatLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'disputed'>('all');
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [chatDetail, setChatDetail] = useState<ChatDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false);
  const [pendingReplyImageFile, setPendingReplyImageFile] = useState<File | null>(null);
  const [pendingReplyImagePreview, setPendingReplyImagePreview] = useState('');
  const replyImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (pendingReplyImagePreview) {
        URL.revokeObjectURL(pendingReplyImagePreview);
      }
    };
  }, [pendingReplyImagePreview]);

  const clearPendingReplyImage = () => {
    if (pendingReplyImagePreview) {
      URL.revokeObjectURL(pendingReplyImagePreview);
    }

    setPendingReplyImageFile(null);
    setPendingReplyImagePreview('');

    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = '';
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

  const setPendingReplyImage = (file: File) => {
    validateImageFile(file);

    if (pendingReplyImagePreview) {
      URL.revokeObjectURL(pendingReplyImagePreview);
    }

    setPendingReplyImageFile(file);
    setPendingReplyImagePreview(URL.createObjectURL(file));
  };

  const fetchChatLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/admin/chat-logs?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '获取聊天记录失败');
      }

      setChatGroups(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('获取聊天记录失败:', error);
      alert(error.message || '获取聊天记录失败');
      setChatGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetail = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/chat-logs/${encodeURIComponent(orderId)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '获取聊天详情失败');
      }

      setChatDetail(result.data);
    } catch (error: any) {
      console.error('获取聊天详情失败:', error);
      alert(error.message || '获取聊天详情失败');
      setChatDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const uploadChatImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'screenshot');

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success || !result.url || !result.key) {
      throw new Error(result.error || '图片上传失败');
    }

    return {
      key: result.key as string,
      url: result.url as string,
    };
  };

  const applySentMessage = (message: SentChatMessageResponse) => {
    if (!selectedGroup || !message.id) {
      return;
    }

    const normalizedMessage: ChatMessage = {
      id: message.id,
      sender: message.senderId || 'admin',
      senderType: message.senderType || 'admin',
      senderName: message.senderName || '客服',
      content: message.messageType === 'image' ? '' : message.content || '',
      fileKey: message.fileKey,
      imageUrl: message.imageUrl,
      messageType: message.messageType || 'text',
      timestamp: message.createdAt || new Date().toISOString(),
    };

    setChatDetail((current) => {
      if (!current || current.orderId !== selectedGroup.orderId) {
        return current;
      }

      return {
        ...current,
        messages: [...current.messages, normalizedMessage],
      };
    });

    setChatGroups((current) =>
      current.map((group) =>
        group.orderId === selectedGroup.orderId
          ? {
              ...group,
              lastMessage: normalizedMessage.messageType === 'image' ? '[图片]' : normalizedMessage.content,
              lastMessageTime: normalizedMessage.timestamp,
              messageCount: group.messageCount + 1,
            }
          : group,
      ),
    );
  };

  const sendReply = async () => {
    const content = replyContent.trim();
    const hasPendingImage = Boolean(pendingReplyImageFile);

    if (!selectedGroup || (!content && !hasPendingImage)) {
      return;
    }

    try {
      setSendingReply(true);

      if (pendingReplyImageFile) {
        setUploadingReplyImage(true);
        const uploaded = await uploadChatImage(pendingReplyImageFile);
        const imageResponse = await fetch(`/api/admin/chat-logs/${encodeURIComponent(selectedGroup.orderId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: uploaded.key, messageType: 'image' }),
        });
        const imageResult = await imageResponse.json();

        if (!imageResponse.ok || !imageResult.success) {
          throw new Error(imageResult.error || '发送图片失败');
        }

        applySentMessage(imageResult.data || {});
        clearPendingReplyImage();
        setUploadingReplyImage(false);
      }

      if (content) {
        const response = await fetch(`/api/admin/chat-logs/${encodeURIComponent(selectedGroup.orderId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || '发送消息失败');
        }

        applySentMessage(result.data || {});
        setReplyContent('');
      }
    } catch (error: any) {
      console.error('发送客服消息失败', error);
      alert(error.message || '发送消息失败');
    } finally {
      setSendingReply(false);
      setUploadingReplyImage(false);
    }
  };

  useEffect(() => {
    if (!selectedGroup) {
      void fetchChatLogs();
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (selectedGroup) {
      void fetchChatDetail(selectedGroup.orderId);
    }
  }, [selectedGroup]);

  const handleSearch = () => {
    setPage(1);
    void fetchChatLogs();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setPendingReplyImage(file);
    } catch (error: any) {
      alert(error?.message || '图片处理失败');
      if (replyImageInputRef.current) {
        replyImageInputRef.current.value = '';
      }
    }
  };

  const handleReplyPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();

    try {
      setPendingReplyImage(file);
    } catch (error: any) {
      alert(error?.message || '图片处理失败');
    }
  };

  const renderReplyComposer = () => (
    <Card>
      <CardHeader>
        <CardTitle>客服回复</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={replyImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {pendingReplyImagePreview ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">待发送图片</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={clearPendingReplyImage}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <img src={pendingReplyImagePreview} alt="待发送图片预览" className="max-h-64 rounded-lg object-contain" />
            <p className="mt-2 text-xs text-slate-500">图片已加入待发送区，点击“发送消息”后才会真正发出。</p>
          </div>
        ) : null}

        <Input
          value={replyContent}
          onChange={(event) => setReplyContent(event.target.value)}
          onPaste={handleReplyPaste}
          placeholder="输入客服消息，或直接粘贴截图"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void sendReply();
            }
          }}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => replyImageInputRef.current?.click()}
            disabled={sendingReply || uploadingReplyImage}
          >
            {uploadingReplyImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="ml-2">选择图片</span>
          </Button>
          <Button
            onClick={() => void sendReply()}
            disabled={sendingReply || uploadingReplyImage || (!replyContent.trim() && !pendingReplyImageFile)}
          >
            {sendingReply || uploadingReplyImage ? '发送中...' : '发送消息'}
          </Button>
        </div>

        <p className="text-xs text-gray-500">这里只会在具体订单聊天详情中显示回复入口，列表页不会提供直接回复。</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">交易群聊记录</h1>
        <p className="mt-1 text-sm text-gray-600">列表页只负责筛选和进入订单详情，客服回复入口只在订单聊天详情里显示。</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索订单号、买家或卖家"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'completed' | 'disputed') => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="disputed">争议中</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>
        </CardContent>
      </Card>

      {!selectedGroup ? (
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">加载中...</div>
              </CardContent>
            </Card>
          ) : chatGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">暂无聊天记录</div>
              </CardContent>
            </Card>
          ) : (
            chatGroups.map((group) => (
              <Card key={group.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-500">{group.orderId}</div>
                        {getStatusBadge(group.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <div className="mb-1 text-xs text-gray-500">买家</div>
                          <div className="text-sm font-medium">{group.buyer}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-gray-500">卖家</div>
                          <div className="text-sm font-medium">{group.seller}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-gray-500">消息数</div>
                          <div className="text-sm font-medium">{group.messageCount} 条</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-gray-500">创建时间</div>
                          <div className="text-sm">{formatDateTime(group.createdAt)}</div>
                        </div>
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <div className="text-sm text-gray-600">
                          最后消息：<span className="font-medium">{group.lastMessage}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(group.lastMessageTime)}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSelectedGroup(group)}>
                      查看聊天
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {!loading && chatGroups.length > 0 && total > pageSize ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                上一页
              </Button>
              <span className="flex items-center text-sm text-gray-600">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(Math.ceil(total / pageSize), current + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGroup(null);
                  setChatDetail(null);
                  setReplyContent('');
                  clearPendingReplyImage();
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
              <div>
                <h3 className="text-lg font-semibold">{selectedGroup.orderId}</h3>
                <div className="text-sm text-gray-600">
                  {selectedGroup.buyer} {'->'} {selectedGroup.seller}
                </div>
              </div>
              {getStatusBadge(selectedGroup.status)}
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">加载中...</div>
              </CardContent>
            </Card>
          ) : chatDetail && chatDetail.messages.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>聊天记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chatDetail.messages.map((message) => {
                    const isSystem = message.senderType === 'system';

                    return (
                      <div key={message.id} className={`flex gap-3 ${isSystem ? 'justify-center' : ''}`}>
                        {!isSystem ? (
                          <div className="flex-shrink-0">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                message.senderType === 'buyer'
                                  ? 'bg-violet-100'
                                  : message.senderType === 'seller'
                                    ? 'bg-emerald-100'
                                    : 'bg-blue-100'
                              }`}
                            >
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                        ) : null}

                        <div className={`flex-1 ${isSystem ? 'max-w-2xl' : ''}`}>
                          <div className={`mb-1 flex items-center gap-2 ${isSystem ? 'justify-center' : ''}`}>
                            {!isSystem ? (
                              <>
                                <span className="text-sm font-medium">{message.senderName}</span>
                                {getSenderRoleBadge(message.senderType)}
                              </>
                            ) : null}
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(message.timestamp)}
                            </span>
                          </div>

                          <div
                            className={`rounded-lg p-3 ${
                              isSystem
                                ? 'bg-gray-100 text-center text-sm'
                                : message.senderType === 'buyer'
                                  ? 'bg-violet-50'
                                  : message.senderType === 'seller'
                                    ? 'bg-emerald-50'
                                    : 'bg-blue-50'
                            }`}
                          >
                            {message.messageType === 'image' ? (
                              <a href={message.imageUrl || '#'} target="_blank" rel="noreferrer">
                                <img src={message.imageUrl} alt="聊天图片" className="max-h-72 max-w-full rounded-lg object-contain" />
                              </a>
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">暂无聊天消息</div>
              </CardContent>
            </Card>
          )}

          {renderReplyComposer()}
        </div>
      )}
    </div>
  );
}
