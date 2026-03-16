'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, ImagePlus, Loader2, Search, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatMessage {
  id: string;
  sender: string;
  senderType: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  content: string;
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

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-purple-500">进行中</Badge>;
    case 'completed':
      return <Badge className="bg-green-500">已完成</Badge>;
    case 'disputed':
      return <Badge variant="destructive">争议中</Badge>;
    default:
      return <Badge variant="secondary">未知</Badge>;
  }
}

function getSenderRoleBadge(role: string) {
  switch (role) {
    case 'buyer':
      return <Badge className="bg-purple-500 text-xs">买家</Badge>;
    case 'seller':
      return <Badge className="bg-green-500 text-xs">卖家</Badge>;
    case 'admin':
      return <Badge className="bg-blue-500 text-xs">客服</Badge>;
    case 'system':
      return <Badge variant="secondary" className="text-xs">系统</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">未知</Badge>;
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
  const replyImageInputRef = useRef<HTMLInputElement | null>(null);

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

  const sendReply = async () => {
    if (!selectedGroup || !replyContent.trim()) {
      return;
    }

    try {
      setSendingReply(true);
      const response = await fetch(`/api/admin/chat-logs/${encodeURIComponent(selectedGroup.orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '发送消息失败');
      }

      setReplyContent('');
      await fetchChatDetail(selectedGroup.orderId);
      await fetchChatLogs();
    } catch (error: any) {
      console.error('发送客服消息失败:', error);
      alert(error.message || '发送消息失败');
    } finally {
      setSendingReply(false);
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

    if (!response.ok || !result.success || !result.url) {
      throw new Error(result.error || '图片上传失败');
    }

    return result.url as string;
  };

  const sendImageReply = async (file: File) => {
    if (!selectedGroup) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG、PNG、WEBP 图片');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('图片不能超过 3MB');
      return;
    }

    try {
      setUploadingReplyImage(true);
      const imageUrl = await uploadChatImage(file);
      const response = await fetch(`/api/admin/chat-logs/${encodeURIComponent(selectedGroup.orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: imageUrl, messageType: 'image' }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '发送图片失败');
      }

      await fetchChatDetail(selectedGroup.orderId);
      await fetchChatLogs();
    } catch (error: any) {
      console.error('发送客服图片失败:', error);
      alert(error.message || '发送图片失败');
    } finally {
      setUploadingReplyImage(false);
      if (replyImageInputRef.current) {
        replyImageInputRef.current.value = '';
      }
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
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void sendImageReply(file);
            }
          }}
        />
        <Input
          value={replyContent}
          onChange={(event) => setReplyContent(event.target.value)}
          placeholder="输入客服消息"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void sendReply();
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => replyImageInputRef.current?.click()} disabled={sendingReply || uploadingReplyImage}>
            {uploadingReplyImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
          <Button onClick={() => void sendReply()} disabled={sendingReply || uploadingReplyImage || !replyContent.trim()}>
            {sendingReply ? '发送中...' : '发送客服消息'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">当前回复入口只会在进入具体订单聊天详情后显示。</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">交易群聊记录</h1>
        <p className="mt-1 text-sm text-gray-600">列表页只做筛选和进入订单详情，回复入口仅在订单聊天详情内显示。</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索订单号"
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
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
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
                  <div className="flex items-start justify-between">
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
                    <Button variant="outline" size="sm" className="ml-4" onClick={() => setSelectedGroup(group)}>
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
                                  ? 'bg-purple-100'
                                  : message.senderType === 'seller'
                                    ? 'bg-green-100'
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
                                  ? 'bg-purple-50'
                                  : message.senderType === 'seller'
                                    ? 'bg-green-50'
                                    : 'bg-blue-50'
                            }`}
                          >
                            {message.messageType === 'image' ? (
                              <a href={message.content} target="_blank" rel="noreferrer">
                                <img src={message.content} alt="聊天图片" className="max-h-72 max-w-full rounded-lg object-contain" />
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
