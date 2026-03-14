'use client';

import { useEffect, useState } from 'react';
import { Banknote, CheckCircle, CreditCard, Loader2, RefreshCw, Search, Wallet, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  actualAmount: number;
  type: 'alipay' | 'wechat' | 'bank';
  accountNumber: string;
  accountName: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected';
  applyTime: string;
  processTime?: string;
  reviewComment?: string;
  remark?: string;
}

type WithdrawalStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminWithdrawals() {
  const [activeTab, setActiveTab] = useState<'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatusFilter>('all');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadWithdrawals();
  }, [statusFilter, page]);

  async function loadWithdrawals() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/withdrawals?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '加载提现列表失败');
        return;
      }

      setWithdrawals(result.data || []);
    } catch (error) {
      console.error('[admin-withdrawals] load failed:', error);
      toast.error('加载提现列表失败');
    } finally {
      setLoading(false);
    }
  }

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return matchesStatus;
    }

    return (
      matchesStatus &&
      ((withdrawal.accountNumber || '').toLowerCase().includes(keyword) ||
        (withdrawal.accountName || '').toLowerCase().includes(keyword))
    );
  });

  function getStatusBadge(status: Withdrawal['status']) {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待审核</Badge>;
      case 'approved':
        return <Badge className="bg-green-600">已通过</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  }

  function getTypeIcon(type: Withdrawal['type']) {
    switch (type) {
      case 'alipay':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'wechat':
        return <Wallet className="h-4 w-4 text-green-500" />;
      case 'bank':
        return <Banknote className="h-4 w-4 text-gray-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('确定通过这笔提现吗？')) {
      return;
    }

    try {
      setProcessingId(id);
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          withdrawalId: id,
          status: 'approved',
          reviewComment: '审核通过',
        }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '审核通过失败');
        return;
      }

      toast.success('提现已通过');
      await loadWithdrawals();
    } catch (error) {
      console.error('[admin-withdrawals] approve failed:', error);
      toast.error('审核通过失败');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    const reviewComment = prompt('请输入拒绝原因:')?.trim();
    if (!reviewComment) {
      return;
    }

    try {
      setProcessingId(id);
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          withdrawalId: id,
          status: 'rejected',
          reviewComment,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '审核拒绝失败');
        return;
      }

      toast.success('提现已拒绝');
      await loadWithdrawals();
    } catch (error) {
      console.error('[admin-withdrawals] reject failed:', error);
      toast.error('审核拒绝失败');
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = withdrawals.filter((item) => item.status === 'pending').length;
  const approvedCount = withdrawals.filter((item) => item.status === 'approved').length;
  const rejectedCount = withdrawals.filter((item) => item.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">提现审核</h1>
          <p className="mt-1 text-sm text-gray-600">仅保留一条审核链路：申请 -&gt; 后台审核 -&gt; 微信转账或退回余额</p>
        </div>
        <Button variant="outline" onClick={() => void loadWithdrawals()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待审核</p>
                <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
              </div>
              <Wallet className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已通过</p>
                <p className="mt-1 text-2xl font-bold">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已拒绝</p>
                <p className="mt-1 text-2xl font-bold">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'list')}>
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="搜索账户名或账户号"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as WithdrawalStatusFilter)}
                  className="rounded-md border px-3 py-2"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : filteredWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-gray-500">
                暂无提现记录
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredWithdrawals.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(withdrawal.type)}
                            <span className="text-sm font-medium text-gray-600">
                              {withdrawal.type === 'alipay'
                                ? '支付宝'
                                : withdrawal.type === 'wechat'
                                  ? '微信'
                                  : '银行卡'}
                            </span>
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div>
                            <p className="text-xs text-gray-500">提现金额</p>
                            <p className="text-lg font-bold">¥{withdrawal.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">手续费</p>
                            <p className="text-sm">¥{withdrawal.fee.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">实际到账</p>
                            <p className="text-sm font-medium text-green-600">¥{withdrawal.actualAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">申请时间</p>
                            <p className="text-sm">{new Date(withdrawal.applyTime).toLocaleString('zh-CN')}</p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <p className="text-sm">
                            <span className="text-gray-500">账户名：</span>
                            {withdrawal.accountName || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-500">账号：</span>
                            {withdrawal.accountNumber || '-'}
                          </p>
                          {withdrawal.bankName ? (
                            <p className="text-sm">
                              <span className="text-gray-500">开户行：</span>
                              {withdrawal.bankName}
                            </p>
                          ) : null}
                          {withdrawal.reviewComment ? (
                            <p className="text-sm text-gray-600">
                              <span className="text-gray-500">审核意见：</span>
                              {withdrawal.reviewComment}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {withdrawal.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => void handleApprove(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            size="sm"
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            通过
                          </Button>
                          <Button
                            onClick={() => void handleReject(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            variant="destructive"
                            size="sm"
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            拒绝
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
