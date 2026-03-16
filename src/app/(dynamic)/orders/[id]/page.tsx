'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { buildWechatPaymentHrefForCurrentEnv } from '@/lib/wechat/payment-entry';

type OrderDispute = {
  id: string;
  status: string;
  disputeType: string;
  reason: string;
  resolution?: string | null;
  initiatorName: string;
  respondentName: string;
  createdAt?: string | null;
  resolvedAt?: string | null;
};

type OrderDetail = {
  id: string;
  orderNo?: string;
  status: string;
  buyerId: string;
  sellerId: string;
  accountName?: string;
  accountTitle?: string;
  rentalPrice?: number;
  deposit?: number;
  totalPrice?: number;
  total_price?: number;
  rentalDuration?: number;
  startTime?: string | null;
  endTime?: string | null;
  verificationDeadline?: string | null;
  verificationResult?: string | null;
  verificationRemark?: string | null;
  disputeReason?: string | null;
  dispute?: OrderDispute | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
};

type LoginPayload = {
  qrCodeContent?: string;
  qrCodeUrl?: string;
  loginInfo?: {
    loginMethod?: string;
    qqAccount?: string | null;
    qqPassword?: string | null;
    accountTitle?: string;
    expiryTime?: string;
  };
};

const statusMeta: Record<string, { label: string; className?: string }> = {
  pending_payment: { label: '待支付' },
  paid: { label: '待开始', className: 'bg-blue-600 hover:bg-blue-600' },
  active: { label: '进行中', className: 'bg-purple-600 hover:bg-purple-600' },
  pending_verification: { label: '待验收', className: 'bg-yellow-500 hover:bg-yellow-500 text-black' },
  disputed: { label: '争议中', className: 'bg-red-600 hover:bg-red-600' },
  completed: { label: '已完成', className: 'bg-green-600 hover:bg-green-600' },
  refunding: { label: '退款中', className: 'bg-orange-500 hover:bg-orange-500' },
  refunded: { label: '已退款', className: 'bg-slate-600 hover:bg-slate-600' },
  cancelled: { label: '已取消', className: 'bg-slate-500 hover:bg-slate-500' },
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN');
}

function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0);
  return `¥${amount.toFixed(2)}`;
}

function formatCountdown(ms: number) {
  if (ms <= 0) {
    return '已到期';
  }

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0 || days > 0) parts.push(`${hours}小时`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}分钟`);
  parts.push(`${seconds}秒`);
  return parts.join(' ');
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLoginInfo, setLoadingLoginInfo] = useState(false);
  const [loginPayload, setLoginPayload] = useState<LoginPayload | null>(null);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [verifyingOrder, setVerifyingOrder] = useState<'pass' | 'reject' | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [pendingPaymentMs, setPendingPaymentMs] = useState<number | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  useEffect(() => {
    void loadOrderDetail();
  }, [id]);

  useEffect(() => {
    if (!order?.endTime || order.status !== 'active') {
      setRemainingMs(null);
      return;
    }

    const update = () => {
      setRemainingMs(new Date(order.endTime!).getTime() - Date.now());
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order?.endTime, order?.status]);

  useEffect(() => {
    if (!order?.createdAt || order.status !== 'pending_payment') {
      setPendingPaymentMs(null);
      return;
    }

    const createdAt = new Date(order.createdAt).getTime();
    if (Number.isNaN(createdAt)) {
      setPendingPaymentMs(null);
      return;
    }

    const update = () => {
      setPendingPaymentMs(createdAt + 3 * 60 * 1000 - Date.now());
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order?.createdAt, order?.status]);

  const statusBadge = useMemo(() => {
    const meta = statusMeta[order?.status || ''] || { label: order?.status || '--' };
    return (
      <Badge className={meta.className} variant={meta.className ? 'default' : 'secondary'}>
        {meta.label}
      </Badge>
    );
  }, [order?.status]);

  async function loadOrderDetail() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}`, { credentials: 'include' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '加载订单失败');
      }

      setOrder(result.data);
    } catch (error: any) {
      console.error('加载订单失败:', error);
      toast.error(error.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadLoginInfo() {
    try {
      setLoadingLoginInfo(true);
      const response = await fetch(`/api/orders/${id}/qrcode`, { credentials: 'include' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取登录信息失败');
      }

      setLoginPayload(result.data);
      await loadOrderDetail();
    } catch (error: any) {
      console.error('获取登录信息失败:', error);
      toast.error(error.message || '获取登录信息失败');
    } finally {
      setLoadingLoginInfo(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制`);
    } catch {
      toast.error('复制失败');
    }
  }

  function handlePayNow() {
    if (!order) return;
    window.location.href = buildWechatPaymentHrefForCurrentEnv({ orderId: order.id });
  }

  async function handleCancelOrder() {
    if (!confirm('确认取消这个待支付订单吗？')) {
      return;
    }

    try {
      setCancellingOrder(true);
      const response = await fetch(`/api/orders/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '取消订单失败');
      }

      toast.success(result.message || '订单已取消');
      await loadOrderDetail();
    } catch (error: any) {
      console.error('取消订单失败:', error);
      toast.error(error.message || '取消订单失败');
    } finally {
      setCancellingOrder(false);
    }
  }

  async function handleReturnAccount() {
    if (!confirm('确认归还账号吗？归还后订单会进入待验收状态。')) {
      return;
    }

    try {
      setCompletingOrder(true);
      const response = await fetch(`/api/orders/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'complete' }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '归还账号失败');
      }

      toast.success(result.message || '已提交归还，等待卖家验收');
      await loadOrderDetail();
    } catch (error: any) {
      console.error('归还账号失败:', error);
      toast.error(error.message || '归还账号失败');
    } finally {
      setCompletingOrder(false);
    }
  }

  async function handleVerifyOrder(action: 'pass' | 'reject') {
    try {
      setVerifyingOrder(action);
      const response = await fetch(`/api/orders/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          remark:
            action === 'pass'
              ? '卖家验收通过，账号状态正常'
              : '卖家验收未通过，申请平台介入处理',
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '验收操作失败');
      }

      toast.success(result.message || '验收结果已提交');
      await loadOrderDetail();
    } catch (error: any) {
      console.error('验收操作失败:', error);
      toast.error(error.message || '验收操作失败');
    } finally {
      setVerifyingOrder(null);
    }
  }

  async function handleCreateDispute() {
    if (!disputeReason.trim()) {
      toast.error('请先填写纠纷原因');
      return;
    }

    try {
      setSubmittingDispute(true);
      const response = await fetch(`/api/orders/${id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: disputeReason.trim(),
          disputeType: 'after_sale',
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '发起纠纷失败');
      }

      toast.success(result.message || '纠纷已提交，平台会尽快处理');
      setDisputeReason('');
      await loadOrderDetail();
    } catch (error: any) {
      console.error('发起纠纷失败:', error);
      toast.error(error.message || '发起纠纷失败');
    } finally {
      setSubmittingDispute(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        订单不存在
      </div>
    );
  }

  const showLoginCard = ['paid', 'active'].includes(order.status);
  const canCreateDispute =
    ['active', 'pending_verification', 'disputed'].includes(order.status) &&
    order.dispute?.status !== 'pending';

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回订单列表
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground">订单号</div>
          <div className="font-mono text-sm">{order.orderNo || order.id}</div>
          {statusBadge}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>订单概览</CardTitle>
                <CardDescription>查看租赁状态、时间节点和争议处理结果。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="mb-1 text-sm text-muted-foreground">创建时间</div>
                    <div className="font-medium">{formatDateTime(order.createdAt || order.created_at)}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="mb-1 text-sm text-muted-foreground">租赁时长</div>
                    <div className="font-medium">{order.rentalDuration || 0} 小时</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="mb-1 text-sm text-muted-foreground">开始时间</div>
                    <div className="font-medium">{formatDateTime(order.startTime)}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="mb-1 text-sm text-muted-foreground">结束时间</div>
                    <div className="font-medium">{formatDateTime(order.endTime)}</div>
                  </div>
                </div>

                {order.status === 'active' ? (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-1 flex items-center gap-2 text-sm text-purple-700">
                          <Clock className="h-4 w-4" />
                          租赁剩余时间
                        </div>
                        <div className="text-2xl font-semibold text-purple-900">
                          {remainingMs === null ? '--' : formatCountdown(remainingMs)}
                        </div>
                      </div>
                      <Shield className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                ) : null}

                {order.status === 'pending_verification' ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    买家已申请归还账号，当前等待卖家验收。
                    <div className="mt-1 text-yellow-700">
                      验收截止时间：{formatDateTime(order.verificationDeadline)}
                    </div>
                  </div>
                ) : null}

                {order.status === 'pending_payment' ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <div>订单已创建，等待支付。未支付订单会在 3 分钟后自动取消。</div>
                    <div className="mt-1 text-blue-700">
                      剩余支付时间：{pendingPaymentMs === null ? '--' : formatCountdown(pendingPaymentMs)}
                    </div>
                  </div>
                ) : null}

                {order.status === 'refunding' ? (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                    平台已发起退款，正在等待微信退款结果回调。
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>账号信息</CardTitle>
                <CardDescription>当前订单绑定的账号基础信息。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">账号名称</div>
                    <div className="font-medium">{order.accountName || order.accountTitle || '游戏账号'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">订单状态</div>
                    <div>{statusBadge}</div>
                  </div>
                </div>

                {(order.verificationResult || order.verificationRemark) ? (
                  <>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-muted-foreground">验收结果</div>
                        <div className="font-medium">{order.verificationResult || '--'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">验收备注</div>
                        <div className="font-medium">{order.verificationRemark || '--'}</div>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {showLoginCard ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>登录凭证</CardTitle>
                      <CardDescription>仅在已支付或进行中的订单里展示。</CardDescription>
                    </div>
                    {!loginPayload ? (
                      <Button variant="outline" onClick={loadLoginInfo} disabled={loadingLoginInfo}>
                        {loadingLoginInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        获取登录信息
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingLoginInfo ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : null}

                  {!loadingLoginInfo && !loginPayload ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      点击“获取登录信息”后，这里会直接展示账号密码或二维码。
                    </div>
                  ) : null}

                  {!loadingLoginInfo && loginPayload?.loginInfo ? (
                    <div className="space-y-4">
                      {['qq', 'password'].includes(loginPayload.loginInfo.loginMethod || '') ? (
                        <div className="space-y-3">
                          <div>
                            <Label>账号</Label>
                            <div className="mt-2 flex gap-2">
                              <Input readOnly value={loginPayload.loginInfo.qqAccount || ''} />
                              <Button
                                variant="outline"
                                onClick={() => handleCopy(loginPayload.loginInfo?.qqAccount || '', '账号')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label>密码</Label>
                            <div className="mt-2 flex gap-2">
                              <Input readOnly value={loginPayload.loginInfo.qqPassword || ''} />
                              <Button
                                variant="outline"
                                onClick={() => handleCopy(loginPayload.loginInfo?.qqPassword || '', '密码')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center rounded-xl border bg-white p-6">
                            <QRCode value={loginPayload.qrCodeContent || loginPayload.qrCodeUrl || order.id} size={180} />
                            <div className="mt-4 text-sm text-muted-foreground">使用微信扫码登录账号</div>
                          </div>
                          {loginPayload.qrCodeContent ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleCopy(loginPayload.qrCodeContent || '', '二维码内容')}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              复制二维码内容
                            </Button>
                          ) : null}
                        </div>
                      )}

                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        请勿修改密码、转移资产或使用外挂工具，租期结束后请及时退出账号。
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>纠纷与售后</CardTitle>
                <CardDescription>这里展示真实争议单状态，后台处理后会同步回订单。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.dispute ? (
                  <div className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant={order.dispute.status === 'pending' ? 'destructive' : 'secondary'}>
                        {order.dispute.status === 'pending' ? '处理中' : '已处理'}
                      </Badge>
                      <div className="text-sm text-muted-foreground">{order.dispute.disputeType}</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">发起人：</span>
                        {order.dispute.initiatorName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">纠纷原因：</span>
                        {order.dispute.reason}
                      </div>
                      <div>
                        <span className="text-muted-foreground">创建时间：</span>
                        {formatDateTime(order.dispute.createdAt)}
                      </div>
                      {order.dispute.resolution ? (
                        <div>
                          <span className="text-muted-foreground">处理结果：</span>
                          {order.dispute.resolution}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    当前订单还没有纠纷记录。
                  </div>
                )}

                {canCreateDispute ? (
                  <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
                    <Label htmlFor="dispute-reason">发起纠纷</Label>
                    <Textarea
                      id="dispute-reason"
                      value={disputeReason}
                      onChange={(event) => setDisputeReason(event.target.value)}
                      placeholder="请描述账号异常、售后问题或需要平台介入的原因"
                      className="min-h-[100px]"
                    />
                    <Button onClick={handleCreateDispute} disabled={submittingDispute}>
                      {submittingDispute ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                      提交纠纷
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>订单金额</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">租金</span>
                  <span className="font-medium">{formatMoney(order.rentalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">押金</span>
                  <span className="font-medium">{formatMoney(order.deposit)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">总计</span>
                  <span className="text-2xl font-semibold text-green-600">
                    {formatMoney(order.totalPrice ?? order.total_price)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>订单操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.status === 'pending_payment' ? (
                  <>
                    <Button className="w-full" onClick={handlePayNow}>
                      立即支付
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleCancelOrder} disabled={cancellingOrder}>
                      取消订单
                    </Button>
                  </>
                ) : null}

                {order.status === 'paid' ? (
                  <Button className="w-full" onClick={loadLoginInfo} disabled={loadingLoginInfo}>
                    {loadingLoginInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    开始使用
                  </Button>
                ) : null}

                {order.status === 'active' ? (
                  <>
                    <Button className="w-full" onClick={handleReturnAccount} disabled={completingOrder}>
                      {completingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      归还账号
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      申请退款
                    </Button>
                  </>
                ) : null}

                {order.status === 'pending_verification' ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleVerifyOrder('pass')}
                      disabled={verifyingOrder !== null}
                    >
                      {verifyingOrder === 'pass' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      验收通过
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleVerifyOrder('reject')}
                      disabled={verifyingOrder !== null}
                    >
                      {verifyingOrder === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      验收不通过
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>帮助支持</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  联系客服
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
