'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Order {
  id: string;
  orderNo: string;
  buyerId: string;
  sellerId: string;
  accountId: string;
  status: string;
  rentalDuration: number;
  rentalPrice: number;
  deposit: number;
  totalPrice: number;
  buyerName: string;
  sellerName: string;
  accountTitle: string;
  coinsM: number;
  paymentMethod?: string;
  paymentTime?: string;
  startTime?: string;
  endTime?: string;
  verificationDeadline?: string;
  verificationResult?: string;
  verificationRemark?: string;
  disputeReason?: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_payment' | 'pending_verification' | 'active' | 'completed' | 'cancelled' | 'disputed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, page, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', PAGE_SIZE.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
        setTotal(result.total || 0);
      } else {
        toast.error(result.error || '加载订单列表失败');
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (order: Order) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '加载订单详情失败');
      }

      setSelectedOrder({ ...order, ...result.data });
    } catch (error: any) {
      console.error('加载订单详情失败:', error);
      toast.error(error.message || '加载订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="secondary">待付款</Badge>;
      case 'pending_verification':
        return <Badge className="bg-yellow-500">待验收</Badge>;
      case 'active':
        return <Badge className="bg-purple-500">进行中</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">已取消</Badge>;
      case 'disputed':
        return <Badge className="bg-red-500">争议中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <p className="mt-1 text-sm text-gray-600">管理平台的所有订单</p>
        </div>
        <Button variant="outline" onClick={loadOrders} disabled={loading}>
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
                  placeholder="搜索订单号..."
                  value={searchQuery}
                  onChange={(e) => {
                    setPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => {
              setPage(1);
              setStatusFilter(value);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending_payment">待付款</SelectItem>
                <SelectItem value="pending_verification">待验收</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
                <SelectItem value="disputed">争议中</SelectItem>
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
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-gray-500">
            暂无订单记录
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-500">{order.orderNo}</span>
                      {getOrderStatusBadge(order.status)}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">买家</p>
                        <p className="text-sm font-medium">{order.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">卖家</p>
                        <p className="text-sm font-medium">{order.sellerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">账号</p>
                        <p className="text-sm">{order.accountTitle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">金币数</p>
                        <p className="text-sm">{order.coinsM}M</p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">租金</p>
                        <p className="text-lg font-bold">¥{Number(order.rentalPrice || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">押金</p>
                        <p className="text-sm">¥{Number(order.deposit || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">总价</p>
                        <p className="text-sm font-medium text-green-600">¥{Number(order.totalPrice || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">租期</p>
                        <p className="text-sm">{order.rentalDuration} 天</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <span>创建时间：</span>
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => openOrderDetail(order)} disabled={detailLoading}>
                    <Eye className="mr-2 h-4 w-4" />
                    查看
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

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader>
              <CardTitle>订单详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">基本信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">订单号：</span>{selectedOrder.orderNo}</p>
                  <p><span className="text-gray-500">状态：</span>{getOrderStatusBadge(selectedOrder.status)}</p>
                  <p><span className="text-gray-500">买家：</span>{selectedOrder.buyerName}</p>
                  <p><span className="text-gray-500">卖家：</span>{selectedOrder.sellerName}</p>
                  <p><span className="text-gray-500">账号：</span>{selectedOrder.accountTitle}</p>
                  <p><span className="text-gray-500">金币数：</span>{selectedOrder.coinsM}M</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">金额信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">租金：</span>¥{Number(selectedOrder.rentalPrice || 0).toFixed(2)}</p>
                  <p><span className="text-gray-500">押金：</span>¥{Number(selectedOrder.deposit || 0).toFixed(2)}</p>
                  <p><span className="text-gray-500">总价：</span>¥{Number(selectedOrder.totalPrice || 0).toFixed(2)}</p>
                  <p><span className="text-gray-500">租期：</span>{selectedOrder.rentalDuration} 天</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">时间信息</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">创建时间：</span>{new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}</p>
                  {selectedOrder.paymentTime && <p><span className="text-gray-500">支付时间：</span>{new Date(selectedOrder.paymentTime).toLocaleString('zh-CN')}</p>}
                  {selectedOrder.startTime && <p><span className="text-gray-500">开始时间：</span>{new Date(selectedOrder.startTime).toLocaleString('zh-CN')}</p>}
                  {selectedOrder.endTime && <p><span className="text-gray-500">结束时间：</span>{new Date(selectedOrder.endTime).toLocaleString('zh-CN')}</p>}
                  {selectedOrder.verificationDeadline && <p><span className="text-gray-500">验收截止：</span>{new Date(selectedOrder.verificationDeadline).toLocaleString('zh-CN')}</p>}
                </div>
              </div>

              {(selectedOrder.verificationResult || selectedOrder.verificationRemark || selectedOrder.disputeReason) && (
                <div>
                  <h3 className="mb-2 font-semibold">验收 / 纠纷信息</h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.verificationResult && <p><span className="text-gray-500">验收结果：</span>{selectedOrder.verificationResult}</p>}
                    {selectedOrder.verificationRemark && <p><span className="text-gray-500">验收备注：</span>{selectedOrder.verificationRemark}</p>}
                    {selectedOrder.disputeReason && <p><span className="text-gray-500">纠纷原因：</span>{selectedOrder.disputeReason}</p>}
                  </div>
                </div>
              )}

              <Button onClick={() => setSelectedOrder(null)} className="w-full">
                关闭
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
