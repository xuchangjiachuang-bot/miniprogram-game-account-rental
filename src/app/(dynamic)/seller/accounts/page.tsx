'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';

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
  viewCount: number;
  tradeCount: number;
  createdAt: string;
}

export default function SellerAccounts() {
  const { user } = useUser();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'available' | 'rented' | 'sold'>('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载账号列表
  useEffect(() => {
    loadAccounts();
  }, [user?.id, statusFilter, auditStatusFilter]);

  const loadAccounts = async () => {
    if (!user?.id) {
      setError('请先登录');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('sellerId', user.id);

      // 状态过滤
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      // 审核状态过滤
      if (auditStatusFilter !== 'all') {
        params.append('auditStatus', auditStatusFilter);
      }

      const response = await fetch(`/api/accounts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('获取账号列表失败');
      }

      const result = await response.json();

      if (result.success) {
        setAccounts(result.data);
      } else {
        throw new Error(result.error || '获取账号列表失败');
      }
    } catch (err: any) {
      setError(err.message || '获取账号列表失败');
      console.error('加载账号列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    const matchesAuditStatus = auditStatusFilter === 'all' || account.auditStatus === auditStatusFilter;
    const matchesSearch = account.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.accountId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesAuditStatus && matchesSearch;
  });

  const getAuditStatusBadge = (auditStatus: string) => {
    switch (auditStatus) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />待审核</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />已通过</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />已拒绝</Badge>;
      default:
        return <Badge variant="secondary">{auditStatus}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">草稿</Badge>;
      case 'available':
        return <Badge className="bg-blue-500">在售中</Badge>;
      case 'rented':
        return <Badge className="bg-orange-500">租赁中</Badge>;
      case 'sold':
        return <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">已售出</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canEdit = (account: Account) => {
    return account.auditStatus === 'approved' && account.status === 'available' && account.tradeCount === 0;
  };

  const handleEdit = (account: Account) => {
    // 跳转到编辑页面，传入账号ID
    router.push(`/seller/accounts/new?id=${account.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？')) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除账号失败');
      }

      alert('账号已删除');
      loadAccounts();
    } catch (err: any) {
      alert(err.message || '删除账号失败');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">请先登录查看账号</p>
              <Button onClick={() => router.push('/login')}>去登录</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的账号</h1>
            <p className="text-gray-600 mt-1">管理您的游戏账号</p>
          </div>
          <Link href="/seller/accounts/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              上架新账号
            </Button>
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">{accounts.length}</div>
              <div className="text-sm text-gray-600 mt-1">总账号数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-500">
                {accounts.filter(a => a.auditStatus === 'pending').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">待审核</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-500">
                {accounts.filter(a => a.auditStatus === 'approved' && a.status === 'available').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">在售中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {accounts.filter(a => a.tradeCount > 0).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">已交易</div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="搜索账号名称或ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="账号状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="available">在售中</SelectItem>
                  <SelectItem value="rented">租赁中</SelectItem>
                  <SelectItem value="sold">已售出</SelectItem>
                </SelectContent>
              </Select>
              <Select value={auditStatusFilter} onValueChange={(value: any) => setAuditStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="审核状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部审核</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <Card key={account.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{account.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">ID: {account.accountId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <span className="font-semibold text-gray-900">{account.coinsM}M 哈夫币</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {getAuditStatusBadge(account.auditStatus)}
                          {getStatusBadge(account.status)}
                        </div>
                      </div>
                      {account.auditReason && account.auditStatus === 'rejected' && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                          拒绝原因：{account.auditReason}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">买家支付</span>
                        <span className="font-semibold text-gray-900">
                          {account.accountValue ? `¥${account.accountValue}` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="font-medium text-green-700">您的收入</span>
                        <span className="font-bold text-green-600">
                          {(() => {
                            if (!account.accountValue) return '-';
                            const commissionRate = 5; // 平台佣金5%
                            const withdrawalFee = 1; // 提现手续费1%
                            const sellerIncome = parseFloat(account.accountValue) * (1 - commissionRate / 100) * (1 - withdrawalFee / 100);
                            return `¥${sellerIncome.toFixed(2)}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">平台佣金</span>
                        <span className="text-gray-900">
                          {(() => {
                            if (!account.accountValue) return '-';
                            const commissionRate = 5; // 平台佣金5%
                            const commission = parseFloat(account.accountValue) * commissionRate / 100;
                            return `¥${commission.toFixed(2)}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">提现手续费</span>
                        <span className="text-gray-900">
                          {(() => {
                            if (!account.accountValue) return '-';
                            const commissionRate = 5; // 平台佣金5%
                            const withdrawalFee = 1; // 提现手续费1%
                            const sellerIncome = parseFloat(account.accountValue) * (1 - commissionRate / 100);
                            const fee = sellerIncome * withdrawalFee / 100;
                            return `¥${fee.toFixed(2)}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">浏览次数</span>
                        <span className="text-gray-900">{account.viewCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">交易次数</span>
                        <span className="text-gray-900">{account.tradeCount}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(account.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="flex gap-2 pt-2">
                        {canEdit(account) ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEdit(account)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(account.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled
                          >
                            {account.status === 'rented' ? '租赁中' :
                             account.status === 'sold' ? '已售出' :
                             account.auditStatus === 'pending' ? '待审核' :
                             account.auditStatus === 'rejected' ? '已拒绝' :
                             '不可编辑'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
