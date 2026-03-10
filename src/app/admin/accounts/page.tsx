'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye, Search, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Account {
  id: string;
  accountId: string;
  title: string;
  description: string | null;
  coinsM: string;
  safeboxCount: number;
  energyValue: number;
  staminaValue: number;
  hasSkins: boolean;
  skinTier: string | null;
  skinCount: number;
  hasBattlepass: boolean;
  battlepassLevel: number;
  accountValue: string | null;
  recommendedRental: string | null;
  deposit: string;
  totalPrice: string | null;
  rentalDays: string | null;
  rentalHours: string | null;
  rentalDescription: string | null;
  status: string;
  auditStatus: string;
  auditReason: string | null;
  sellerId: string;
  viewCount: number;
  tradeCount: number;
  createdAt: string;
}

export default function AdminAccounts() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; accountId: string | null }>({
    open: false,
    accountId: null
  });
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 加载账号列表
  useEffect(() => {
    loadAccounts();
  }, [statusFilter]);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 如果只看待审核的，使用专用接口
      if (statusFilter === 'pending') {
        const response = await fetch('/api/admin/accounts/pending-audit', {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            window.location.href = '/admin/login';
            return;
          }
          throw new Error('获取待审核账号失败');
        }
        const result = await response.json();
        if (result.success) {
          setAccounts(result.data.accounts);
        } else {
          throw new Error(result.error || '获取待审核账号失败');
        }
      } else {
        // 其他状态，使用通用接口
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('auditStatus', statusFilter);
        }
        const response = await fetch(`/api/accounts?${params.toString()}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            window.location.href = '/admin/login';
            return;
          }
          throw new Error('获取账号列表失败');
        }
        const result = await response.json();
        if (result.success) {
          setAccounts(result.data);
        } else {
          throw new Error(result.error || '获取账号列表失败');
        }
      }
    } catch (err: any) {
      setError(err.message || '获取账号列表失败');
      console.error('加载账号列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesStatus = statusFilter === 'all' || account.auditStatus === statusFilter;
    const matchesSearch = account.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.accountId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待审核</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleApprove = async (accountId: string) => {
    setProcessingId(accountId);
    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (!response.ok) {
        throw new Error('审核通过失败');
      }

      const result = await response.json();
      if (result.success) {
        alert(result.message || '账号已通过审核');
        loadAccounts();
      } else {
        throw new Error(result.error || '审核通过失败');
      }
    } catch (err: any) {
      alert(err.message || '审核通过失败');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (accountId: string) => {
    setRejectDialog({ open: true, accountId });
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectDialog.accountId || !rejectReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }

    setProcessingId(rejectDialog.accountId);
    try {
      const response = await fetch(`/api/admin/accounts/${rejectDialog.accountId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectReason.trim()
        })
      });

      if (!response.ok) {
        throw new Error('审核拒绝失败');
      }

      const result = await response.json();
      if (result.success) {
        alert(result.message || '账号已拒绝');
        setRejectDialog({ open: false, accountId: null });
        setRejectReason('');
        loadAccounts();
      } else {
        throw new Error(result.error || '审核拒绝失败');
      }
    } catch (err: any) {
      alert(err.message || '审核拒绝失败');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账号审核</h1>
          <p className="text-sm text-gray-600 mt-1">审核和管理卖家提交的账号上架申请</p>
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
                  placeholder="搜索账号名称或ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="审核状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 加载状态 */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">加载中...</p>
          </CardContent>
        </Card>
      )}

      {/* 错误状态 */}
      {error && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadAccounts}>重试</Button>
          </CardContent>
        </Card>
      )}

      {/* 账号列表 */}
      {!isLoading && !error && (
        <>
          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">暂无账号</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{account.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">账号ID: {account.accountId}</p>
                          </div>
                          {getStatusBadge(account.auditStatus)}
                        </div>

                        {/* 账号详情 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">哈夫币</p>
                            <p className="font-semibold">{account.coinsM}M</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">推荐租金</p>
                            <p className="font-semibold">{account.recommendedRental ? `¥${account.recommendedRental}` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">押金</p>
                            <p className="font-semibold">¥{account.deposit}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">安全箱</p>
                            <p className="font-semibold">{account.safeboxCount}格</p>
                          </div>
                        </div>

                        {/* 额外信息 */}
                        <div className="space-y-1 text-sm text-gray-600 mb-4">
                          {account.description && (
                            <p><span className="font-medium">描述：</span>{account.description}</p>
                          )}
                          <p><span className="font-medium">体力：</span>{account.staminaValue} | <span className="font-medium">负重：</span>{account.energyValue}</p>
                          {account.hasSkins && (
                            <p><span className="font-medium">皮肤：</span>{account.skinTier} ({account.skinCount}个)</p>
                          )}
                          {account.hasBattlepass && (
                            <p><span className="font-medium">战斗通行证：</span>{account.battlepassLevel}级</p>
                          )}
                          <p><span className="font-medium">提交时间：</span>{new Date(account.createdAt).toLocaleString('zh-CN')}</p>
                        </div>

                        {/* 拒绝原因 */}
                        {account.auditReason && account.auditStatus === 'rejected' && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                            <span className="font-medium">拒绝原因：</span>{account.auditReason}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      {account.auditStatus === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(account.id)}
                            disabled={processingId === account.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === account.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                通过
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => openRejectDialog(account.id)}
                            disabled={processingId === account.id}
                            variant="destructive"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 拒绝对话框 */}
      {rejectDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectDialog({ open: false, accountId: null })}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">拒绝账号</h2>
            <Textarea
              placeholder="请输入拒绝原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectDialog({ open: false, accountId: null })}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId !== null}
              >
                {processingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '确认拒绝'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
