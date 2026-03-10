'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Search, Clock, CheckCircle, XCircle, Settings, CreditCard, Banknote, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  applyTime: string;
  processTime?: string;
  reviewComment?: string;
  remark?: string;
}

export default function AdminWithdrawals() {
  const [activeTab, setActiveTab] = useState<'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'rejected'>('all');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 加载提现申请列表
  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter, page]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '20');
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/withdrawals?${params.toString()}`, {
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setWithdrawals(result.data || []);
        setTotal(result.total || 0);
      } else {
        toast.error(result.error || '加载提现列表失败');
      }
    } catch (error) {
      console.error('加载提现列表失败:', error);
      toast.error('加载提现列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesSearch = w.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         w.accountName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待审核</Badge>;
      case 'processing':
        return <Badge className="bg-purple-500">处理中</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alipay':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'wechat':
        return <Wallet className="h-4 w-4 text-green-500" />;
      case 'bank':
        return <Banknote className="h-4 w-4 text-gray-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('确定批准此提现申请？')) return;

    try {
      setProcessingId(id);
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approved: true,
          remark: '审核通过'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('提现已批准');
        loadWithdrawals();
      } else {
        toast.error(result.error || '批准失败');
      }
    } catch (error) {
      console.error('批准提现失败:', error);
      toast.error('批准失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const remark = prompt('请输入拒绝原因：');
    if (!remark) return;

    try {
      setProcessingId(id);
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approved: false,
          remark
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('提现已拒绝');
        loadWithdrawals();
      } else {
        toast.error(result.error || '拒绝失败');
      }
    } catch (error) {
      console.error('拒绝提现失败:', error);
      toast.error('拒绝失败');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">提现自动分账系统</h1>
          <p className="text-sm text-gray-600 mt-1">管理提现申请和自动分账配置</p>
        </div>
        <Button
          variant="outline"
          onClick={loadWithdrawals}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待审核</p>
                <p className="text-2xl font-bold mt-1">
                  {withdrawals.filter(w => w.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理中</p>
                <p className="text-2xl font-bold mt-1">
                  {withdrawals.filter(w => w.status === 'processing').length}
                </p>
              </div>
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-2xl font-bold mt-1">
                  {withdrawals.filter(w => w.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已拒绝</p>
                <p className="text-2xl font-bold mt-1">
                  {withdrawals.filter(w => w.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsContent value="list" className="space-y-4">
          {/* 筛选和搜索 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索账户名或账号..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待审核</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 提现列表 */}
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(withdrawal.type)}
                            <span className="text-sm font-medium text-gray-600">
                              {withdrawal.type === 'alipay' ? '支付宝' :
                               withdrawal.type === 'wechat' ? '微信' : '银行卡'}
                            </span>
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            {withdrawal.accountName}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-500">账号：</span>
                            {withdrawal.accountNumber}
                          </p>
                          {withdrawal.bankName && (
                            <p className="text-sm">
                              <span className="text-gray-500">开户行：</span>
                              {withdrawal.bankName}
                            </p>
                          )}
                          {withdrawal.reviewComment && (
                            <p className="text-sm text-gray-600">
                              <span className="text-gray-500">审核意见：</span>
                              {withdrawal.reviewComment}
                            </p>
                          )}
                        </div>
                      </div>

                      {withdrawal.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleApprove(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            size="sm"
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            批准
                          </Button>
                          <Button
                            onClick={() => handleReject(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            variant="destructive"
                            size="sm"
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
