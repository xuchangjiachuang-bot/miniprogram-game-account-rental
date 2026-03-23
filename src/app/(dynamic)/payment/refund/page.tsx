'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderInfo {
  id: string;
  totalPrice: number;
  status: string;
  transactionId?: string;
}

function RefundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSuccess, setRefundSuccess] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('订单号不存在');
      setLoading(false);
      return;
    }

    loadOrderInfo();
  }, [orderId]);

  const loadOrderInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '加载订单失败');
        return;
      }

      const order = result.data;

      // 检查订单状态
      if (order.status !== 'active' && order.status !== 'refunding') {
        setError('只有已支付并进入使用流程的订单才能申请退款');
        return;
      }

      setOrderInfo({
        id: order.id,
        totalPrice: order.total_price,
        status: order.status,
        transactionId: order.transaction_id,
      });

      // 默认退款金额为订单金额
      setRefundAmount(order.total_price.toString());

    } catch (err: any) {
      setError(err.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!orderInfo) return;

    // 验证退款金额
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的退款金额');
      return;
    }

    if (amount > orderInfo.totalPrice) {
      toast.error('退款金额不能超过订单金额');
      return;
    }

    if (!refundReason.trim()) {
      toast.error('请输入退款原因');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/payment/wechat/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderInfo.id,
          refundAmount: amount,
          refundReason: refundReason.trim(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '退款申请失败');
      }

      setRefundSuccess(true);
      toast.success('退款申请已提交');

    } catch (err: any) {
      setError(err.message || '退款申请失败');
      toast.error(err.message || '退款申请失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !orderInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 flex justify-center">
              <Button onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (refundSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">退款申请已提交</h2>
              <p className="text-slate-600 mb-6">
                我们将在 1-3 个工作日内处理您的退款申请
              </p>
              <Button onClick={handleBack} className="w-full">
                返回订单
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  申请退款
                </CardTitle>
                <CardDescription>
                  请填写退款信息
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 订单信息 */}
            {orderInfo && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">订单信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">订单号</span>
                    <span className="font-mono text-slate-900">{orderInfo.id.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">订单金额</span>
                    <span className="font-bold text-slate-900">¥{orderInfo.totalPrice.toFixed(2)}</span>
                  </div>
                  {orderInfo.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">微信交易号</span>
                      <span className="font-mono text-slate-900">{orderInfo.transactionId.substring(0, 16)}...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 退款金额 */}
            <div>
              <Label htmlFor="refundAmount">退款金额（元）</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={orderInfo?.totalPrice}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="请输入退款金额"
              />
              <p className="text-sm text-slate-600 mt-1">
                最大可退款金额：¥{orderInfo?.totalPrice.toFixed(2)}
              </p>
            </div>

            {/* 退款原因 */}
            <div>
              <Label htmlFor="refundReason">退款原因</Label>
              <Textarea
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请详细描述退款原因"
                rows={4}
                className="mt-1"
              />
            </div>

            {/* 提示信息 */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>退款说明</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>退款金额将在 1-3 个工作日内原路退回到您的支付账户</li>
                  <li>退款处理期间，订单状态将显示为"退款中"</li>
                  <li>部分退款后，剩余金额将继续有效</li>
                  <li>如有疑问，请联系客服</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* 提交按钮 */}
            <Button
              onClick={handleRefund}
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交退款申请'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RefundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600">加载中...</p>
        </CardContent>
      </Card>
    </div>}>
      <RefundContent />
    </Suspense>
  );
}
