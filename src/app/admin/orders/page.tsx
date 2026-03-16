'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatServerDateTime } from '@/lib/time';

interface OrderDispute {
  id: string;
  status: string;
  disputeType: string;
  reason: string;
  resolution?: string | null;
  initiatorName: string;
  respondentName: string;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

interface ConsumptionSettlementItem {
  id: string;
  itemName: string;
  unitPrice: string;
  unitLabel: string;
  quantity: string;
  subtotal: string;
  remark?: string | null;
}

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
  dispute?: OrderDispute | null;
  consumptionSettlement?: {
    id?: string;
    status: string;
    requestedAmount: string;
    approvedAmount?: string;
    depositDeductedAmount: string;
    buyerRefundAmount: string;
    offlineSettledAmount?: string;
    sellerRemark?: string | null;
    buyerRemark?: string | null;
    items?: ConsumptionSettlementItem[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

function formatMoney(value?: string | number | null) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  return formatServerDateTime(value);
}

function getSettlementStatusLabel(status?: string | null) {
  switch (status) {
    case 'pending_buyer_confirmation':
      return '待买家确认';
    case 'confirmed':
      return '已确认';
    case 'rejected':
      return '已拒绝';
    case 'disputed':
      return '争议中';
    case 'cancelled':
      return '已取消';
    default:
      return status || '--';
  }
}

function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'pending_payment':
      return <Badge variant="secondary">待支付</Badge>;
    case 'pending_verification':
      return <Badge className="bg-yellow-500 text-black hover:bg-yellow-500">待验收</Badge>;
    case 'pending_consumption_confirm':
      return <Badge className="bg-amber-500 text-black hover:bg-amber-500">待买家确认结算</Badge>;
    case 'active':
      return <Badge className="bg-purple-500 hover:bg-purple-500">进行中</Badge>;
    case 'completed':
      return <Badge className="bg-green-500 hover:bg-green-500">已完成</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">已取消</Badge>;
    case 'disputed':
      return <Badge className="bg-red-500 hover:bg-red-500">争议中</Badge>;
    case 'refunding':
      return <Badge className="bg-orange-500 hover:bg-orange-500">退款中</Badge>;
    case 'refunded':
      return <Badge className="bg-slate-500 hover:bg-slate-500">已退款</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_payment' | 'pending_verification' | 'pending_consumption_confirm' | 'active' | 'completed' | 'cancelled' | 'disputed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [disputeRemark, setDisputeRemark] = useState('');
  const [disputeActionLoading, setDisputeActionLoading] = useState(false);

  useEffect(() => {
    void loadOrders();
  }, [statusFilter, page, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function loadOrders() {
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
  }

  async function openOrderDetail(order: Order) {
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
      setDisputeRemark(result.data?.dispute?.reason || '');
    } catch (error: any) {
      console.error('加载订单详情失败:', error);
      toast.error(error.message || '加载订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDisputeDecision(decision: 'refund_buyer_full' | 'resume_order' | 'complete_order') {
    if (!selectedOrder) {
      return;
    }

    try {
      setDisputeActionLoading(true);
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          remark: disputeRemark,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '处理争议失败');
      }

      toast.success(result.message || '争议处理成功');
      await loadOrders();
      await openOrderDetail(selectedOrder);
    } catch (error: any) {
      console.error('处理争议失败:', error);
      toast.error(error.message || '处理争议失败');
    } finally {
      setDisputeActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <p className="mt-1 text-sm text-gray-600">查看订单状态、验收结果、资源消耗结算和争议处理情况。</p>
        </div>
        <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
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
                  placeholder="搜索订单号"
                  value={searchQuery}
                  onChange={(event) => {
                    setPage(1);
                    setSearchQuery(event.target.value);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value: typeof statusFilter) => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending_payment">待支付</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="pending_verification">待验收</SelectItem>
                <SelectItem value="pending_consumption_confirm">待买家确认结算</SelectItem>
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
                      <InfoBlock label="买家" value={order.buyerName} />
                      <InfoBlock label="卖家" value={order.sellerName} />
                      <InfoBlock label="账号" value={order.accountTitle} />
                      <InfoBlock label="哈夫币" value={`${order.coinsM}M`} />
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <InfoBlock label="租金" value={formatMoney(order.rentalPrice)} strong />
                      <InfoBlock label="押金" value={formatMoney(order.deposit)} />
                      <InfoBlock label="总额" value={formatMoney(order.totalPrice)} strong valueClassName="text-green-600" />
                      <InfoBlock label="租期" value={`${order.rentalDuration} 天`} />
                    </div>

                    <div className="text-sm text-gray-500">
                      创建时间：{formatDate(order.createdAt)}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => void openOrderDetail(order)} disabled={detailLoading}>
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

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <CardTitle>订单详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section>
                <h3 className="mb-2 font-semibold">基本信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">订单号：</span>{selectedOrder.orderNo}</p>
                  <p><span className="text-gray-500">状态：</span>{getOrderStatusBadge(selectedOrder.status)}</p>
                  <p><span className="text-gray-500">买家：</span>{selectedOrder.buyerName}</p>
                  <p><span className="text-gray-500">卖家：</span>{selectedOrder.sellerName}</p>
                  <p><span className="text-gray-500">账号：</span>{selectedOrder.accountTitle}</p>
                  <p><span className="text-gray-500">哈夫币：</span>{selectedOrder.coinsM}M</p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">金额信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">租金：</span>{formatMoney(selectedOrder.rentalPrice)}</p>
                  <p><span className="text-gray-500">押金：</span>{formatMoney(selectedOrder.deposit)}</p>
                  <p><span className="text-gray-500">总额：</span>{formatMoney(selectedOrder.totalPrice)}</p>
                  <p><span className="text-gray-500">租期：</span>{selectedOrder.rentalDuration} 天</p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">时间信息</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">创建时间：</span>{formatDate(selectedOrder.createdAt)}</p>
                  {selectedOrder.paymentTime ? <p><span className="text-gray-500">支付时间：</span>{formatDate(selectedOrder.paymentTime)}</p> : null}
                  {selectedOrder.startTime ? <p><span className="text-gray-500">开始时间：</span>{formatDate(selectedOrder.startTime)}</p> : null}
                  {selectedOrder.endTime ? <p><span className="text-gray-500">结束时间：</span>{formatDate(selectedOrder.endTime)}</p> : null}
                  {selectedOrder.verificationDeadline ? <p><span className="text-gray-500">验收截止：</span>{formatDate(selectedOrder.verificationDeadline)}</p> : null}
                </div>
              </section>

              {(selectedOrder.verificationResult || selectedOrder.verificationRemark || selectedOrder.disputeReason) ? (
                <section>
                  <h3 className="mb-2 font-semibold">验收 / 争议信息</h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.verificationResult ? <p><span className="text-gray-500">验收结果：</span>{selectedOrder.verificationResult}</p> : null}
                    {selectedOrder.verificationRemark ? <p><span className="text-gray-500">验收备注：</span>{selectedOrder.verificationRemark}</p> : null}
                    {selectedOrder.disputeReason ? <p><span className="text-gray-500">争议原因：</span>{selectedOrder.disputeReason}</p> : null}
                  </div>
                </section>
              ) : null}

              {selectedOrder.consumptionSettlement ? (
                <section className="rounded-lg border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">资源消耗结算</h3>
                    <Badge variant="secondary">{getSettlementStatusLabel(selectedOrder.consumptionSettlement.status)}</Badge>
                  </div>

                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p><span className="text-gray-500">申请金额：</span>{formatMoney(selectedOrder.consumptionSettlement.requestedAmount)}</p>
                    <p><span className="text-gray-500">批准金额：</span>{formatMoney(selectedOrder.consumptionSettlement.approvedAmount)}</p>
                    <p><span className="text-gray-500">押金内扣：</span>{formatMoney(selectedOrder.consumptionSettlement.depositDeductedAmount)}</p>
                    <p><span className="text-gray-500">买家应退：</span>{formatMoney(selectedOrder.consumptionSettlement.buyerRefundAmount)}</p>
                    <p><span className="text-gray-500">线下已结：</span>{formatMoney(selectedOrder.consumptionSettlement.offlineSettledAmount)}</p>
                  </div>

                  {selectedOrder.consumptionSettlement.items?.length ? (
                    <div className="mt-4 space-y-2">
                      {selectedOrder.consumptionSettlement.items.map((item) => (
                        <div key={item.id} className="rounded-lg border bg-white px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-xs text-gray-500">
                                {item.quantity}
                                {item.unitLabel}
                                {' x '}
                                {formatMoney(item.unitPrice)}
                              </div>
                            </div>
                            <div className="font-medium">{formatMoney(item.subtotal)}</div>
                          </div>
                          {item.remark ? <div className="mt-1 text-xs text-gray-500">备注：{item.remark}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {selectedOrder.consumptionSettlement.sellerRemark ? (
                    <p className="mt-3 text-sm text-gray-600">卖家备注：{selectedOrder.consumptionSettlement.sellerRemark}</p>
                  ) : null}
                  {selectedOrder.consumptionSettlement.buyerRemark ? (
                    <p className="mt-1 text-sm text-gray-600">买家备注：{selectedOrder.consumptionSettlement.buyerRemark}</p>
                  ) : null}
                </section>
              ) : null}

              {selectedOrder.dispute ? (
                <section className="space-y-3 rounded-lg border bg-slate-50 p-4">
                  <div>
                    <h3 className="mb-2 font-semibold">争议单</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">状态：</span>{selectedOrder.dispute.status}</p>
                      <p><span className="text-gray-500">类型：</span>{selectedOrder.dispute.disputeType}</p>
                      <p><span className="text-gray-500">发起人：</span>{selectedOrder.dispute.initiatorName}</p>
                      <p><span className="text-gray-500">对方：</span>{selectedOrder.dispute.respondentName}</p>
                      <p><span className="text-gray-500">原因：</span>{selectedOrder.dispute.reason}</p>
                      {selectedOrder.dispute.createdAt ? <p><span className="text-gray-500">创建时间：</span>{formatDate(selectedOrder.dispute.createdAt)}</p> : null}
                      {selectedOrder.dispute.resolution ? <p><span className="text-gray-500">处理结果：</span>{selectedOrder.dispute.resolution}</p> : null}
                    </div>
                  </div>

                  {selectedOrder.dispute.status === 'pending' ? (
                    <div className="space-y-3 border-t pt-3">
                      <Input
                        value={disputeRemark}
                        onChange={(event) => setDisputeRemark(event.target.value)}
                        placeholder="填写处理备注，例如判定依据或资金处理说明"
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button
                          variant="destructive"
                          onClick={() => void handleDisputeDecision('refund_buyer_full')}
                          disabled={disputeActionLoading}
                        >
                          {disputeActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          全额退款
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void handleDisputeDecision('resume_order')}
                          disabled={disputeActionLoading}
                        >
                          {disputeActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          恢复订单
                        </Button>
                        <Button
                          onClick={() => void handleDisputeDecision('complete_order')}
                          disabled={disputeActionLoading}
                        >
                          {disputeActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          完成并分账
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <Button onClick={() => setSelectedOrder(null)} className="w-full">
                关闭
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  strong = false,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${strong ? 'text-lg font-bold' : 'text-sm'} ${valueClassName || ''}`}>{value}</p>
    </div>
  );
}
