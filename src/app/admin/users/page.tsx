'use client';

import { useEffect, useState } from 'react';
import { Ban, CheckCircle, Loader2, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
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

interface WalletAdjustFormState {
  userId: string;
  amount: string;
  reason: string;
}

interface LegacyCleanupPreview {
  candidates: Array<{
    id: string;
    phone: string;
    nickname: string;
    createdAt: string | null;
  }>;
  summary: {
    users: number;
    accounts: number;
    orders: number;
    groupChats: number;
    balanceRecords: number;
    withdrawalRecords: number;
    paymentRecords: number;
    splitRecords: number;
    disputes: number;
    accountDeposits: number;
  };
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
  const [walletAdjustForm, setWalletAdjustForm] = useState<WalletAdjustFormState | null>(null);
  const [walletAdjusting, setWalletAdjusting] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<LegacyCleanupPreview | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupExecuting, setCleanupExecuting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter, page, searchQuery]);

  useEffect(() => {
    loadCleanupPreview();
  }, []);

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

  const loadCleanupPreview = async () => {
    try {
      setCleanupLoading(true);
      const response = await fetch('/api/admin/users/legacy-phone-cleanup', {
        credentials: 'include',
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '加载旧手机号测试数据预览失败');
        return;
      }

      setCleanupPreview(result.data || null);
    } catch (error) {
      console.error('加载旧手机号测试数据预览失败:', error);
      toast.error('加载旧手机号测试数据预览失败');
    } finally {
      setCleanupLoading(false);
    }
  };

  const executeCleanup = async () => {
    if (!cleanupPreview?.summary.users) {
      toast.success('当前没有需要清理的旧手机号测试数据');
      return;
    }

    const confirmed = window.confirm(
      `确认删除 ${cleanupPreview.summary.users} 个旧手机号测试用户，以及它们关联的账号、订单、余额和支付记录吗？此操作不可恢复。`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setCleanupExecuting(true);
      const response = await fetch('/api/admin/users/legacy-phone-cleanup', {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '清理旧手机号测试数据失败');
        return;
      }

      toast.success(result.message || '旧手机号测试数据已清理');
      await Promise.all([loadUsers(), loadCleanupPreview()]);
    } catch (error) {
      console.error('清理旧手机号测试数据失败:', error);
      toast.error('清理旧手机号测试数据失败');
    } finally {
      setCleanupExecuting(false);
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

  const openWalletAdjust = (user: User) => {
    setWalletAdjustForm({
      userId: user.id,
      amount: '100',
      reason: '联调测试充值',
    });
  };

  const submitWalletAdjust = async () => {
    if (!walletAdjustForm) {
      return;
    }

    const amount = Number(walletAdjustForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('请输入大于 0 的充值金额');
      return;
    }

    try {
      setWalletAdjusting(true);
      const response = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: walletAdjustForm.userId,
          amount,
          reason: walletAdjustForm.reason.trim() || '联调测试充值',
        }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '测试充值失败');
        return;
      }

      toast.success(`测试充值成功，余额已增加 ¥${Number(result.data?.amount || amount).toFixed(2)}`);
      setWalletAdjustForm(null);
      await loadUsers();
    } catch (error) {
      console.error('测试充值失败:', error);
      toast.error('测试充值失败');
    } finally {
      setWalletAdjusting(false);
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
            <Select value={roleFilter} onValueChange={(value: 'all' | 'buyer' | 'seller') => {
              setPage(1);
              setRoleFilter(value);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="用户类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="buyer">买家</SelectItem>
                <SelectItem value="seller">卖家</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'suspended') => {
              setPage(1);
              setStatusFilter(value);
            }}>
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="text-base font-semibold text-gray-900">旧手机号测试数据清理</div>
              <p className="text-sm text-gray-600">
                清理没有任何微信绑定、仅由旧手机号登录遗留的测试用户，并同步删除其关联账号、订单、余额与支付流水。
              </p>
              {cleanupPreview ? (
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <Badge variant="outline">用户 {cleanupPreview.summary.users}</Badge>
                  <Badge variant="outline">账号 {cleanupPreview.summary.accounts}</Badge>
                  <Badge variant="outline">订单 {cleanupPreview.summary.orders}</Badge>
                  <Badge variant="outline">余额流水 {cleanupPreview.summary.balanceRecords}</Badge>
                  <Badge variant="outline">支付记录 {cleanupPreview.summary.paymentRecords}</Badge>
                </div>
              ) : null}
              {cleanupPreview?.candidates?.length ? (
                <div className="text-xs text-gray-500">
                  将清理:
                  {' '}
                  {cleanupPreview.candidates
                    .slice(0, 4)
                    .map((item) => `${item.nickname || item.phone}(${item.phone})`)
                    .join('，')}
                  {cleanupPreview.candidates.length > 4 ? ` 等 ${cleanupPreview.candidates.length} 个用户` : ''}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  {cleanupLoading ? '正在加载清理预览...' : '当前没有可清理的旧手机号测试数据'}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadCleanupPreview} disabled={cleanupLoading || cleanupExecuting}>
                <RefreshCw className={`mr-2 h-4 w-4 ${cleanupLoading ? 'animate-spin' : ''}`} />
                刷新预览
              </Button>
              <Button
                variant="destructive"
                onClick={executeCleanup}
                disabled={cleanupLoading || cleanupExecuting || !cleanupPreview?.summary.users}
              >
                {cleanupExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                一键清理旧手机号测试数据
              </Button>
            </div>
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
                      {user.isVerified && <Badge className="bg-blue-500">已实名</Badge>}
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
                        <p className="text-sm">¥{Number(user.walletBalance || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">冻结余额</p>
                        <p className="text-sm text-orange-600">¥{Number(user.frozenBalance || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      {user.sellerLevel !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500">卖家等级</p>
                          <p className="text-sm">{user.sellerLevel}</p>
                        </div>
                      )}
                      {user.totalTrades !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500">交易次数</p>
                          <p className="text-sm">{user.totalTrades}</p>
                        </div>
                      )}
                      {user.totalOrders !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500">订单数量</p>
                          <p className="text-sm">{user.totalOrders}</p>
                        </div>
                      )}
                      {user.sellerRating && (
                        <div>
                          <p className="text-xs text-gray-500">卖家评分</p>
                          <p className="text-sm">{user.sellerRating}</p>
                        </div>
                      )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWalletAdjust(user)}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    测试充值
                  </Button>
                </div>
                {walletAdjustForm?.userId === user.id ? (
                  <div className="mt-4 rounded-lg border bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-900">
                      为当前用户充值测试余额
                    </div>
                    <div className="grid gap-3 md:grid-cols-[160px_1fr_auto_auto]">
                      <Input
                        value={walletAdjustForm.amount}
                        onChange={(e) => setWalletAdjustForm((current) => current ? {
                          ...current,
                          amount: e.target.value,
                        } : current)}
                        placeholder="充值金额"
                        inputMode="decimal"
                      />
                      <Input
                        value={walletAdjustForm.reason}
                        onChange={(e) => setWalletAdjustForm((current) => current ? {
                          ...current,
                          reason: e.target.value,
                        } : current)}
                        placeholder="备注，如：联调测试充值"
                      />
                      <Button onClick={submitWalletAdjust} disabled={walletAdjusting}>
                        {walletAdjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        确认充值
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setWalletAdjustForm(null)}
                        disabled={walletAdjusting}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}
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
