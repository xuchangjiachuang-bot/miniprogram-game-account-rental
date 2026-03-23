'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, RefreshCw, Smartphone, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getToken } from '@/lib/auth-token';

interface OrderInfo {
  id: string;
  totalPrice: number;
  status: string;
}

interface RechargeInfo {
  id: string;
  amount: number;
  status: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

type ExternalWechatChannel = 'h5' | 'native';

function appendRedirectUrl(mwebUrl: string, redirectUrl: string) {
  const separator = mwebUrl.includes('?') ? '&' : '?';
  return `${mwebUrl}${separator}redirect_url=${encodeURIComponent(redirectUrl)}`;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResult<T>> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('[WeChat External Payment] expected JSON response but received:', {
      status: response.status,
      contentType,
      preview: text.slice(0, 200),
    });
    return {
      success: false,
      error: response.ok ? '接口返回了非 JSON 响应，请稍后重试' : `请求失败，状态码 ${response.status}`,
    };
  }

  return response.json();
}

function ExternalWechatPaymentContent({ channel }: { channel: ExternalWechatChannel }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyOrderId = searchParams.get('orderId');
  const payOrderId = searchParams.get('payOrderId');
  const rechargeId = searchParams.get('rechargeId');
  const rechargeAmount = searchParams.get('rechargeAmount');
  const redirected = searchParams.get('redirected') === '1';
  const orderPaymentDisabled = Boolean(legacyOrderId);

  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [polling, setPolling] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [rechargeInfo, setRechargeInfo] = useState<RechargeInfo | null>(null);
  const [currentRechargeId, setCurrentRechargeId] = useState(rechargeId || '');
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [externalUrl, setExternalUrl] = useState('');
  const [codeUrl, setCodeUrl] = useState('');
  const [finalizingOrder, setFinalizingOrder] = useState(false);

  const amount = useMemo(() => {
    if (orderPaymentDisabled) {
      return Number(orderInfo?.totalPrice || 0);
    }

    return Number(rechargeInfo?.amount || rechargeAmount || 0);
  }, [orderInfo, orderPaymentDisabled, rechargeAmount, rechargeInfo]);

  useEffect(() => {
    setCurrentRechargeId(rechargeId || '');
  }, [rechargeId]);

  useEffect(() => {
    if (!orderPaymentDisabled && !currentRechargeId && !rechargeAmount) {
      setError('缺少充值参数');
      setLoading(false);
      return;
    }

    void loadInitialData();
  }, [currentRechargeId, legacyOrderId, orderPaymentDisabled, rechargeAmount]);

  useEffect(() => {
    if (!polling || orderPaymentDisabled) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkPaymentStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [currentRechargeId, orderPaymentDisabled, polling]);

  useEffect(() => {
    if (orderPaymentDisabled || loading || creatingPayment || autoStarted || paymentStatus !== 'idle') {
      return;
    }

    if (amount <= 0) {
      return;
    }

    if (channel === 'h5' && redirected) {
      setAutoStarted(true);
      setPolling(true);
      return;
    }

    setAutoStarted(true);
    void handlePayment(true);
  }, [amount, autoStarted, channel, creatingPayment, loading, orderPaymentDisabled, paymentStatus, redirected]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      if (orderPaymentDisabled && legacyOrderId) {
        const orderResponse = await fetch(`/api/orders/${legacyOrderId}`, {
          headers,
          cache: 'no-store',
        });
        const orderResult = await parseJsonResponse<any>(orderResponse);

        if (!orderResult.success || !orderResult.data) {
          setError(orderResult.error || '加载订单失败');
          return;
        }

        setOrderInfo({
          id: orderResult.data.id,
          totalPrice: Number(orderResult.data.totalPrice || 0),
          status: orderResult.data.status,
        });

        return;
      }

      if (currentRechargeId) {
        const rechargeResponse = await fetch(`/api/payment/recharge/${currentRechargeId}`, {
          headers,
          cache: 'no-store',
        });
        const rechargeResult = await parseJsonResponse<RechargeInfo>(rechargeResponse);

        if (!rechargeResult.success || !rechargeResult.data) {
          setError(rechargeResult.error || '加载充值单失败');
          return;
        }

        setRechargeInfo(rechargeResult.data);

        if (rechargeResult.data.status === 'success') {
          setPaymentStatus('success');
          await continueAfterRecharge();
        }

        return;
      }

      setRechargeInfo({
        id: '',
        amount: Number(rechargeAmount || 0),
        status: 'draft',
      });
    } catch (requestError: any) {
      setError(requestError.message || '加载支付页面失败');
    } finally {
      setLoading(false);
    }
  }

  async function continueAfterRecharge() {
    if (finalizingOrder) {
      return;
    }

    if (!payOrderId) {
      router.push('/user-center?tab=wallet');
      return;
    }

    const token = getToken();
    if (!token) {
      setPaymentStatus('failed');
      setError('充值成功，但登录状态已失效，请重新登录后查看订单');
      return;
    }

    setFinalizingOrder(true);
    try {
      const payResponse = await fetch(`/api/orders/${payOrderId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'pay' }),
      });
      const payResult = await parseJsonResponse<any>(payResponse);

      if (payResult.success || payResult.code === 'ORDER_ALREADY_PAID') {
        router.push(`/orders/${payOrderId}`);
        return;
      }

      setPaymentStatus('failed');
      setError(payResult.error || '充值成功，但订单自动支付失败，请返回订单页重试');
    } catch (autoPayError: any) {
      setPaymentStatus('failed');
      setError(autoPayError.message || '充值成功，但订单自动支付失败，请返回订单页重试');
    } finally {
      setFinalizingOrder(false);
    }
  }

  async function checkPaymentStatus() {
    try {
      const token = getToken();
      if (!token || !currentRechargeId) {
        return;
      }

      const response = await fetch(`/api/payment/recharge/${currentRechargeId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await parseJsonResponse<RechargeInfo & { failureReason?: string }>(response);

      if (result.success && result.data?.status === 'success') {
        setPolling(false);
        setPaymentStatus('success');
        await continueAfterRecharge();
      } else if (result.success && result.data?.status === 'failed') {
        setPolling(false);
        setPaymentStatus('failed');
        setError(result.data.failureReason || '微信支付未成功，请重新发起充值');
      } else if (!result.success) {
        setError(result.error || '检查充值状态失败');
      }
    } catch (statusError) {
      console.error('[WeChat External Payment] check payment status failed:', statusError);
    }
  }

  async function handlePayment(autoLaunch = false) {
    try {
      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      setCreatingPayment(true);
      setError(null);

      const createResponse = await fetch(`/api/payment/wechat/${channel}/recharge/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(rechargeInfo?.amount || rechargeAmount || 0),
        }),
      });

      const createResult = await parseJsonResponse<any>(createResponse);
      if (!createResult.success || !createResult.data) {
        setPaymentStatus('failed');
        setError(createResult.message || createResult.error || '创建充值支付失败');
        return;
      }

      const nextRechargeId = createResult.data.rechargeId || currentRechargeId;
      if (nextRechargeId) {
        setCurrentRechargeId(nextRechargeId);
      }

      setRechargeInfo((current) => ({
        id: nextRechargeId || '',
        amount: Number(createResult.data.amount || current?.amount || rechargeAmount || 0),
        status: 'pending',
      }));

      if (channel === 'h5') {
        const redirectParams = new URLSearchParams();
        if (nextRechargeId) {
          redirectParams.set('rechargeId', nextRechargeId);
        }
        if (payOrderId) {
          redirectParams.set('payOrderId', payOrderId);
        }
        redirectParams.set('redirected', '1');

        const redirectUrl = `${window.location.origin}/payment/wechat/h5?${redirectParams.toString()}`;
        const nextExternalUrl = appendRedirectUrl(createResult.data.mwebUrl, redirectUrl);
        setExternalUrl(nextExternalUrl);

        if (nextRechargeId) {
          window.history.replaceState({}, '', `/payment/wechat/h5?${redirectParams.toString()}`);
        }

        if (autoLaunch) {
          window.location.replace(nextExternalUrl);
          return;
        }
      }

      if (channel === 'native') {
        if (nextRechargeId) {
          const nativeParams = new URLSearchParams();
          nativeParams.set('rechargeId', nextRechargeId);
          if (payOrderId) {
            nativeParams.set('payOrderId', payOrderId);
          }
          window.history.replaceState({}, '', `/payment/wechat/native?${nativeParams.toString()}`);
        }

        setCodeUrl(createResult.data.codeUrl);
        setPolling(true);
      }
    } catch (payRequestError: any) {
      setPaymentStatus('failed');
      setError(payRequestError.message || '发起充值失败');
    } finally {
      setCreatingPayment(false);
    }
  }

  const title = channel === 'h5' ? '微信 H5 充值' : '微信扫码充值';
  const description = channel === 'h5'
    ? '系统会拉起微信支付完成钱包充值。'
    : '请使用微信扫描二维码完成钱包充值。';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600">正在加载支付信息...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !orderInfo && !rechargeInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>无法发起支付</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => router.back()}>返回</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderPaymentDisabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>订单支付已切换为余额支付</CardTitle>
              <CardDescription>微信支付现在只用于钱包充值，订单不能再直接拉起微信支付。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>请先充值</AlertTitle>
                <AlertDescription>先充值到钱包余额，再回订单页点击“立即支付”。</AlertDescription>
              </Alert>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">订单金额</div>
                <div className="text-3xl font-bold text-slate-900">¥{amount.toFixed(2)}</div>
              </div>

              <div className="grid gap-2">
                <Button className="w-full" onClick={() => router.push('/user-center?tab=wallet')}>
                  前往钱包充值
                </Button>
                <Button className="w-full" variant="outline" onClick={() => router.push(legacyOrderId ? `/orders/${legacyOrderId}` : '/orders')}>
                  返回订单页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {paymentStatus === 'success' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">充值成功</h2>
                <p className="text-slate-600 mb-6">
                  {payOrderId ? '正在自动支付当前订单，完成后会自动跳转。' : '正在跳转回钱包页面...'}
                </p>
                <Button onClick={() => router.push(payOrderId ? `/orders/${payOrderId}` : '/user-center?tab=wallet')} className="w-full">
                  {payOrderId ? '返回订单页' : '返回钱包'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStatus !== 'success' && (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channel === 'h5' && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>手机浏览器支付</AlertTitle>
                  <AlertDescription>适用于微信外打开的手机浏览器，系统会跳转到微信完成充值。</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>支付提示</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {polling && paymentStatus === 'idle' && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>正在确认支付状态</AlertTitle>
                  <AlertDescription>{payOrderId ? '微信充值成功后，系统会自动补扣订单并跳转。' : '微信支付完成后，这里会自动刷新并跳转。'}</AlertDescription>
                </Alert>
              )}

              {finalizingOrder && payOrderId && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>正在自动支付订单</AlertTitle>
                  <AlertDescription>充值已到账，系统正在自动完成订单支付。</AlertDescription>
                </Alert>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500 mb-2">充值金额</div>
                <div className="text-3xl font-bold text-slate-900">¥{amount.toFixed(2)}</div>
              </div>

              {channel === 'native' && codeUrl && (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mx-auto flex w-fit items-center justify-center rounded-lg border bg-white p-3">
                    <QRCode value={codeUrl} size={220} />
                  </div>
                  <p className="mt-4 text-center text-sm text-slate-500">请使用微信扫码完成充值</p>
                </div>
              )}

              {channel === 'h5' && externalUrl && !redirected && (
                <Button className="w-full" onClick={() => window.location.replace(externalUrl)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  前往微信支付
                </Button>
              )}

              <div className="grid gap-2">
                <Button className="w-full" onClick={() => void handlePayment(false)} disabled={creatingPayment}>
                  {creatingPayment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {channel === 'h5' ? '重新拉起 H5 支付' : '刷新二维码'}
                </Button>
                <Button onClick={() => void checkPaymentStatus()} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  检查支付状态
                </Button>
                <Button onClick={() => router.back()} variant="outline" className="w-full">
                  返回
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export function ExternalWechatPaymentPage({ channel }: { channel: ExternalWechatChannel }) {
  return (
    <Suspense fallback={null}>
      <ExternalWechatPaymentContent channel={channel} />
    </Suspense>
  );
}
