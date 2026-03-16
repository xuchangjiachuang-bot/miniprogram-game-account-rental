'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, MessageSquare, ShoppingCart, Store } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getToken } from '@/lib/auth-token';
import { formatServerDateTime } from '@/lib/time';

interface Order {
  id: string;
  order_no: string;
  buyer_id: string;
  seller_id: string;
  coins_million: number;
  price_ratio: number;
  rent_amount: number;
  deposit_amount: number;
  total_amount: number;
  rent_hours: number;
  status: string;
  refund_amount?: number;
  created_at: string;
}

const statusMeta: Record<string, { label: string; className?: string }> = {
  pending: { label: '待支付' },
  pending_payment: { label: '待支付' },
  paid: { label: '已支付', className: 'bg-blue-600 text-white' },
  active: { label: '租赁中', className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0' },
  pending_verification: { label: '待验收', className: 'bg-yellow-500 text-black' },
  pending_consumption_confirm: { label: '待买家确认结算', className: 'bg-amber-500 text-black' },
  completed: { label: '已完成', className: 'bg-green-600 text-white' },
  disputed: { label: '争议中', className: 'bg-red-500 text-white' },
  refunding: { label: '退款中', className: 'bg-orange-500 text-white' },
  refunded: { label: '已退款', className: 'bg-slate-500 text-white' },
  cancelled: { label: '已取消', className: 'bg-gray-500 text-white' },
};

function formatMoney(amount: number) {
  return `¥${Number(amount || 0).toFixed(2)}`;
}

function canEnterChat(status: string) {
  return [
    'paid',
    'active',
    'pending_verification',
    'pending_consumption_confirm',
    'completed',
    'disputed',
    'refunding',
    'refunded',
  ].includes(status);
}

function OrderStatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] || { label: status };
  return (
    <Badge className={meta.className} variant={meta.className ? 'default' : 'secondary'}>
      {meta.label}
    </Badge>
  );
}

export default function OrdersPage() {
  const { user, loading: userLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      if (!user?.id) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch('/api/orders', {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (result.success) {
          setOrders(result.data?.orders || []);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error('加载订单失败:', error);
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filteredOrders = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return orders.filter((order) =>
      activeTab === 'buyer' ? order.buyer_id === user.id : order.seller_id === user.id,
    );
  }, [activeTab, orders, user?.id]);

  const stats = useMemo(() => ({
    total: filteredOrders.length,
    pending: filteredOrders.filter((order) => ['pending', 'pending_payment'].includes(order.status)).length,
    active: filteredOrders.filter((order) => order.status === 'active').length,
    completed: filteredOrders.filter((order) => order.status === 'completed').length,
  }), [filteredOrders]);

  if (!userLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h1 className="text-2xl font-semibold text-gray-900">请先登录后查看订单</h1>
              <p className="mt-2 text-sm text-gray-500">登录后可以查看你买入和卖出的全部订单记录。</p>
              <Button asChild className="mt-6">
                <Link href="/login">去登录</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的订单</h1>
          <p className="mt-1 text-gray-600">查看和管理你的交易订单。</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'buyer' | 'seller')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              买家订单
            </TabsTrigger>
            <TabsTrigger value="seller" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              卖家订单
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buyer" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>全部: {stats.total}</span>
              <span>待支付: {stats.pending}</span>
              <span>已完成: {stats.completed}</span>
            </div>
            <OrderList loading={loading} orders={filteredOrders} emptyText="暂无买家订单" />
          </TabsContent>

          <TabsContent value="seller" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>全部: {stats.total}</span>
              <span>租赁中: {stats.active}</span>
              <span>已完成: {stats.completed}</span>
            </div>
            <OrderList loading={loading} orders={filteredOrders} emptyText="暂无卖家订单" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OrderList({
  loading,
  orders,
  emptyText,
}: {
  loading: boolean;
  orders: Order[];
  emptyText: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-500">
          <Clock className="mx-auto mb-4 h-10 w-10 animate-pulse text-gray-300" />
          正在加载订单...
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-500">
          <CheckCircle className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          {emptyText}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{order.order_no}</h3>
                  <OrderStatusBadge status={String(order.status)} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <InfoItem label="哈夫币数量" value={`${order.coins_million}M`} />
                  <InfoItem label="比例" value={`1:${order.price_ratio}`} />
                  <InfoItem label="租期" value={`${order.rent_hours} 小时`} />
                  <InfoItem label="创建时间" value={formatServerDateTime(order.created_at)} />
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">租金</span>
                    <span className="font-semibold">{formatMoney(order.rent_amount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">押金</span>
                    <span className="font-semibold">{formatMoney(order.deposit_amount)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="font-semibold">订单总额</span>
                    <span className="text-lg font-bold text-green-600">{formatMoney(order.total_amount)}</span>
                  </div>
                  {!!order.refund_amount && (
                    <div className="mt-2 text-right text-sm text-gray-500">
                      已退款 {formatMoney(order.refund_amount)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {canEnterChat(String(order.status)) ? (
                  <Button asChild variant="outline">
                    <Link href={`/user-center?tab=chats&orderId=${order.id}`}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      进入群聊
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href={`/orders/${order.id}`}>查看订单</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-600">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
