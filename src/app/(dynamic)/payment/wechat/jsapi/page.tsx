'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Smartphone, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getToken } from '@/lib/auth-token';
import { useWechatJSAPI } from '@/hooks/useWechatJSAPI';

interface OrderInfo {
  id: string;
  totalPrice: number;
  status: string;
  accountId: string;
  accountTitle?: string;
}

interface RechargeInfo {
  id: string;
  amount: number;
  status: string;
}

interface CurrentUserInfo {
  id: string;
  wechatOpenid: string | null;
}

type PaymentMode = 'order' | 'recharge';

function WechatJSAPIPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const rechargeId = searchParams.get('rechargeId');
  const rechargeAmount = searchParams.get('rechargeAmount');
  const mode: PaymentMode = orderId ? 'order' : 'recharge';
  const { loaded, loading: sdkLoading, error: sdkError, isWechat, configWechatSDK } = useWechatJSAPI();

  const [loading, setLoading] = useState(true);
  const [configuringSdk, setConfiguringSdk] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [rechargeInfo, setRechargeInfo] = useState<RechargeInfo | null>(null);
  const [currentRechargeId, setCurrentRechargeId] = useState(rechargeId || '');
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    setCurrentRechargeId(rechargeId || '');
  }, [rechargeId]);

  useEffect(() => {
    if (mode === 'order' && !orderId) {
      setError('订单号不存在');
      setLoading(false);
      return;
    }

    if (mode === 'recharge' && !currentRechargeId && !rechargeAmount) {
      setError('缺少充值参数');
      setLoading(false);
      return;
    }

    void loadInitialData();
  }, [currentRechargeId, mode, orderId, rechargeAmount]);

  useEffect(() => {
    if (!isWechat || !loaded || paymentStatus !== 'idle') {
      return;
    }

    if (mode === 'order' && !orderInfo) {
      return;
    }

    if (mode === 'recharge' && !rechargeInfo && !rechargeAmount) {
      return;
    }

    void setupWechatSdk();
  }, [isWechat, loaded, paymentStatus, mode, orderInfo, rechargeInfo, rechargeAmount]);

  useEffect(() => {
    if (paymentStatus !== 'success' || !polling) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkPaymentStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [paymentStatus, polling, mode, orderId, currentRechargeId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const userResponse = await fetch('/api/auth/me', { headers: authHeaders, cache: 'no-store' });
      const userResult = await userResponse.json();
      if (!userResult.success) {
        setError(userResult.error || '加载用户信息失败');
        return;
      }

      setCurrentUser({
        id: userResult.data.id,
        wechatOpenid: userResult.data.wechatOpenid,
      });

      if (mode === 'order' && orderId) {
        const orderResponse = await fetch(`/api/orders/${orderId}`, { headers: authHeaders, cache: 'no-store' });
        const orderResult = await orderResponse.json();

        if (!orderResult.success) {
          setError(orderResult.error || '加载订单失败');
          return;
        }

        const order = orderResult.data;
        setOrderInfo({
          id: order.id,
          totalPrice: Number(order.totalPrice || 0),
          status: order.status,
          accountId: order.accountId,
        });

        if (order.status === 'paid' || order.status === 'completed') {
          setPaymentStatus('success');
          setPolling(true);
        }
      }

      if (mode === 'recharge') {
        if (currentRechargeId) {
          const rechargeResponse = await fetch(`/api/payment/recharge/${currentRechargeId}`, {
            headers: authHeaders,
            cache: 'no-store',
          });
          const rechargeResult = await rechargeResponse.json();

          if (!rechargeResult.success) {
            setError(rechargeResult.error || '加载充值单失败');
            return;
          }

          setRechargeInfo(rechargeResult.data);

          if (rechargeResult.data.status === 'success') {
            setPaymentStatus('success');
            setPolling(true);
          }
        } else if (rechargeAmount) {
          setRechargeInfo({
            id: '',
            amount: Number(rechargeAmount || 0),
            status: 'draft',
          });
        }
      }
    } catch (requestError: any) {
      setError(requestError.message || '加载支付页面失败');
    } finally {
      setLoading(false);
    }
  }

  async function setupWechatSdk() {
    try {
      setConfiguringSdk(true);
      const signatureResponse = await fetch(`/api/wechat/jsapi-signature?url=${encodeURIComponent(window.location.href)}`);
      const signatureResult = await signatureResponse.json();

      if (!signatureResult.success) {
        throw new Error(signatureResult.error || '获取微信支付签名失败');
      }

      const { appId, timestamp, nonceStr, signature } = signatureResult.data;
      await configWechatSDK(appId, timestamp, nonceStr, signature);
    } catch (sdkConfigError: any) {
      setError(sdkConfigError.message || '初始化微信支付环境失败');
    } finally {
      setConfiguringSdk(false);
    }
  }

  async function checkPaymentStatus() {
    try {
      const token = getToken();
      if (!token) {
        return;
      }

      if (mode === 'order' && orderId) {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (result.success && (result.data.status === 'paid' || result.data.status === 'completed')) {
          setPolling(false);
          router.push(`/orders/${orderId}`);
        }
      }

      if (mode === 'recharge' && currentRechargeId) {
        const response = await fetch(`/api/payment/recharge/${currentRechargeId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (result.success && result.data.status === 'success') {
          setPolling(false);
          router.push('/user-center');
        }
      }
    } catch (statusError) {
      console.error('检查支付状态失败:', statusError);
    }
  }

  async function handlePayment() {
    try {
      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      if (!currentUser?.wechatOpenid) {
        setError('当前账号未绑定微信 openid，无法发起微信支付');
        return;
      }

      if (!isWechat) {
        setError('请在微信内打开当前页面后再发起支付');
        return;
      }

      setCreatingPayment(true);
      setError(null);

      const endpoint = mode === 'order'
        ? '/api/payment/wechat/jsapi/create'
        : '/api/payment/wechat/jsapi/recharge/create';
      const payload = mode === 'order'
        ? {
            orderId,
            openid: currentUser.wechatOpenid,
          }
        : {
            amount: Number(rechargeInfo?.amount || rechargeAmount || 0),
            openid: currentUser.wechatOpenid,
          };

      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const createResult = await createResponse.json();
      if (!createResult.success) {
        setError(createResult.error || '创建支付失败');
        return;
      }

      if (mode === 'recharge' && createResult.data.rechargeId) {
        setCurrentRechargeId(createResult.data.rechargeId);
        setRechargeInfo((current) => ({
          id: createResult.data.rechargeId,
          amount: Number(createResult.data.amount || current?.amount || 0),
          status: 'pending',
        }));
        window.history.replaceState({}, '', `/payment/wechat/jsapi?rechargeId=${createResult.data.rechargeId}`);
      }

      const paymentParams = createResult.data;
      setPaying(true);

      if (typeof window === 'undefined' || !window.wx) {
        setError('微信 SDK 尚未完成初始化');
        return;
      }

      window.wx.chooseWXPay({
        timestamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign,
        success: () => {
          setPaymentStatus('success');
          setPolling(true);
        },
        fail: (payError: any) => {
          console.error('微信支付失败:', payError);
          setPaymentStatus('failed');
          setError('支付未完成，请重试');
        },
        complete: () => {
          setPaying(false);
          setCreatingPayment(false);
        },
      });
    } catch (payRequestError: any) {
      setError(payRequestError.message || '发起支付失败');
      setCreatingPayment(false);
      setPaying(false);
    }
  }

  const title = mode === 'order' ? '微信订单支付' : '微信钱包充值';
  const amount = mode === 'order'
    ? Number(orderInfo?.totalPrice || 0)
    : Number(rechargeInfo?.amount || rechargeAmount || 0);
  const bindWechatUrl = typeof window === 'undefined'
    ? '/api/auth/wechat/authorize?state=payment_bind'
    : `/api/auth/wechat/authorize?state=payment_bind&returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {paymentStatus === 'success' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">支付请求已提交</h2>
                <p className="text-slate-600 mb-6">正在确认支付状态，稍后会自动跳转。</p>
                <Button onClick={() => router.push(mode === 'order' && orderId ? `/orders/${orderId}` : '/user-center')} className="w-full">
                  {mode === 'order' ? '查看订单' : '返回钱包'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStatus === 'failed' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">支付未完成</h2>
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Button onClick={() => { setPaymentStatus('idle'); setError(null); }} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新发起支付
                  </Button>
                  <Button onClick={() => router.back()} variant="outline" className="w-full">
                    返回
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStatus === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>请在微信内完成支付确认</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isWechat && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>请在微信内打开</AlertTitle>
                  <AlertDescription>JSAPI 支付只能在微信内打开当前页面后发起。</AlertDescription>
                </Alert>
              )}

              {currentUser && !currentUser.wechatOpenid && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>请先完成微信授权绑定</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>当前账号虽然已登录，但还没有绑定微信 `openid`，暂时无法发起 JSAPI 支付。</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        window.location.href = bindWechatUrl;
                      }}
                    >
                      去微信授权
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {(sdkError || configuringSdk || sdkLoading) && isWechat && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>正在准备支付环境</AlertTitle>
                  <AlertDescription>{sdkError || '正在初始化微信支付环境...'}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>支付提示</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500 mb-2">{mode === 'order' ? '订单金额' : '充值金额'}</div>
                <div className="text-3xl font-bold text-slate-900">¥{amount.toFixed(2)}</div>
              </div>

              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={creatingPayment || paying || !isWechat || !currentUser?.wechatOpenid || configuringSdk || sdkLoading}
              >
                {(creatingPayment || paying) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                立即微信支付
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function WechatJSAPIPaymentPage() {
  return (
    <Suspense fallback={null}>
      <WechatJSAPIPaymentContent />
    </Suspense>
  );
}
