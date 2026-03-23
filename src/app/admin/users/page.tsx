'use client';

import { useEffect, useState } from 'react';
import { Ban, CheckCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  phone: string;
  nickname: string;
  userType: 'buyer' | 'seller';
  sellerLevel?: number;
  totalTrades?: number;
  totalOrders?: number;
  sellerRating?: string;
  isVerified?: boolean;
  status: 'active' | 'suspended';
  walletBalance: number;
  frozenBalance: number;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter, page, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', PAGE_SIZE.toString());

      if (roleFilter !== 'all') {
        params.append('userType', roleFilter);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
        setTotal(result.total || 0);
      } else {
        toast.error(result.error || '加载用户列表失败');
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: User['status']) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? '启用' : '禁用';

    if (!window.confirm(`确定要${action}这个用户吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `${action}成功`);
        loadUsers();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
      toast.error('操作失败');
    }
  };

  const getRoleBadge = (role: User['userType']) => {
    return role === 'seller'
      ? <Badge className="bg-purple-500">卖家</Badge>
      : <Badge className="bg-green-500">买家</Badge>;
  };

  const getStatusBadge = (status: User['status']) => {
    return status === 'active'
      ? <Badge className="bg-green-500">正常</Badge>
      : <Badge variant="destructive">已禁用</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-600">管理平台用户和账号状态</p>
        </div>
        <Button variant="outline" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[240px] flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索手机号或昵称..."
                  value={searchQuery}
                  onChange={(e) => {
                    setPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value: 'all' | 'buyer' | 'seller') => {
                setPage(1);
                setRoleFilter(value);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="用户类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="buyer">买家</SelectItem>
                <SelectItem value="seller">卖家</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value: 'all' | 'active' | 'suspended') => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="suspended">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-gray-500">
            暂无用户记录
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.userType)}
                        {getStatusBadge(user.status)}
                      </div>
                      {user.isVerified ? <Badge className="bg-blue-500">已实名</Badge> : null}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">昵称</p>
                        <p className="text-sm font-medium">{user.nickname || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">手机号</p>
                        <p className="text-sm">{user.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">钱包余额</p>
                        <p className="text-sm">￥{Number(user.walletBalance || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">冻结余额</p>
                        <p className="text-sm text-orange-600">￥{Number(user.frozenBalance || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      {user.sellerLevel !== undefined ? (
                        <div>
                          <p className="text-xs text-gray-500">卖家等级</p>
                          <p className="text-sm">{user.sellerLevel}</p>
                        </div>
                      ) : null}
                      {user.totalTrades !== undefined ? (
                        <div>
                          <p className="text-xs text-gray-500">交易次数</p>
                          <p className="text-sm">{user.totalTrades}</p>
                        </div>
                      ) : null}
                      {user.totalOrders !== undefined ? (
                        <div>
                          <p className="text-xs text-gray-500">订单数量</p>
                          <p className="text-sm">{user.totalOrders}</p>
                        </div>
                      ) : null}
                      {user.sellerRating ? (
                        <div>
                          <p className="text-xs text-gray-500">卖家评分</p>
                          <p className="text-sm">{user.sellerRating}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="text-sm text-gray-500">
                      <span>注册时间：</span>
                      {new Date(user.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <Button
                    variant={user.status === 'active' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.status)}
                  >
                    {user.status === 'active' ? (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        禁用
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        启用
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4 text-sm text-gray-600">
        <span>第 {page} / {totalPages} 页，共 {total} 条</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
