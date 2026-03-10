'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, User, Bot, Clock, ArrowLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  orderId: string;
  sender: string;
  senderType: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  content: string;
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

  // 获取聊天记录列表
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

      if (!response.ok) {
        throw new Error('获取聊天记录失败');
      }

      const result = await response.json();

      if (!result.success) {
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

  // 获取聊天详情
  const fetchChatDetail = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/chat-logs/${encodeURIComponent(orderId)}`);

      if (!response.ok) {
        throw new Error('获取聊天详情失败');
      }

      const result = await response.json();

      if (!result.success) {
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

  useEffect(() => {
    if (!selectedGroup) {
      fetchChatLogs();
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (selectedGroup) {
      fetchChatDetail(selectedGroup.orderId);
    }
  }, [selectedGroup]);

  const handleSearch = () => {
    setPage(1);
    fetchChatLogs();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
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
  };

  const getSenderRoleBadge = (role: string) => {
    switch (role) {
      case 'buyer':
        return <Badge className="bg-purple-500 text-xs">买家</Badge>;
      case 'seller':
        return <Badge className="bg-green-500 text-xs">卖家</Badge>;
      case 'admin':
        return <Badge className="bg-purple-500 text-xs">管理员</Badge>;
      case 'system':
        return <Badge variant="secondary" className="text-xs">系统</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">未知</Badge>;
    }
  };

  const getSenderIcon = (role: string) => {
    return role === 'system' ? Bot : User;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">交易群聊天记录</h1>
          <p className="text-sm text-gray-600 mt-1">查询和管理订单交易群聊记录</p>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索订单号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
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

      {/* 聊天群组列表 */}
      {!selectedGroup && (
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">加载中...</div>
              </CardContent>
            </Card>
          ) : chatGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">暂无聊天记录</div>
              </CardContent>
            </Card>
          ) : (
            chatGroups.map((group) => (
              <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-sm font-medium text-gray-500">{group.orderId}</div>
                        {getStatusBadge(group.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">买家</div>
                          <div className="text-sm font-medium">{group.buyer}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">卖家</div>
                          <div className="text-sm font-medium">{group.seller}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">消息数</div>
                          <div className="text-sm font-medium">{group.messageCount}条</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">创建时间</div>
                          <div className="text-sm">{formatDateTime(group.createdAt)}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm text-gray-600">
                          最后消息：<span className="font-medium">{group.lastMessage}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatDateTime(group.lastMessageTime)}</div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => setSelectedGroup(group)}
                    >
                      查看聊天
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* 分页 */}
          {!loading && chatGroups.length > 0 && total > pageSize && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 flex items-center">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 聊天记录详情 */}
      {selectedGroup && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedGroup(null);
                setChatDetail(null);
              }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
              <div>
                <h3 className="text-lg font-semibold">{selectedGroup.orderId}</h3>
                <div className="text-sm text-gray-600">
                  {selectedGroup.buyer} ↔ {selectedGroup.seller}
                </div>
              </div>
              {getStatusBadge(selectedGroup.status)}
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">加载中...</div>
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
                    const SenderIcon = getSenderIcon(message.senderType);
                    const isSystem = message.senderType === 'system';

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isSystem ? 'justify-center' : ''}`}
                      >
                        {!isSystem && (
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              message.senderType === 'buyer' ? 'bg-purple-100' :
                              message.senderType === 'seller' ? 'bg-green-100' : 'bg-purple-100'
                            }`}>
                              <SenderIcon className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                        )}
                        <div className={`flex-1 ${isSystem ? 'max-w-2xl' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isSystem ? 'justify-center' : ''}`}>
                            {!isSystem && (
                              <>
                                <span className="text-sm font-medium">{message.senderName}</span>
                                {getSenderRoleBadge(message.senderType)}
                              </>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(message.timestamp)}
                            </span>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            isSystem ? 'bg-gray-100 text-center text-sm' :
                            message.senderType === 'buyer' ? 'bg-purple-50' :
                            message.senderType === 'seller' ? 'bg-green-50' : 'bg-purple-50'
                          }`}>
                            {message.content}
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
                <div className="text-center py-8 text-gray-500">暂无聊天消息</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
