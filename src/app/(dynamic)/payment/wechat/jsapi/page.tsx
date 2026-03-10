'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, CreditCard, Loader2, RefreshCw, Smartphone, XCircle } from 'lucide-react';
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
  coinsM?: number;
  rentalDays?: number;
}

interface CurrentUserInfo {
  id: string;
  wechatOpenid: string | null;
}

function WechatJSAPIPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { loaded, loading: sdkLoading, error: sdkError, isWechat, configWechatSDK } = useWechatJSAPI();

  const [loading, setLoading] = useState(true);
  const [configuringSdk, setConfiguringSdk] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('订单号不存在');
      setLoading(false);
      return;
    }

    void loadInitialData();
  }, [orderId]);

  useEffect(() => {
    if (!isWechat || !loaded || !orderInfo || paymentStatus !== 'idle') {
      return;
    }

    void setupWechatSdk();
  }, [isWechat, loaded, orderInfo, paymentStatus]);

  useEffect(() => {
    if (paymentStatus !== 'success' || !polling) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkOrderStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [paymentStatus, polling]);

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

      const [orderResponse, userResponse] = await Promise.all([
        fetch(`/api/orders/${orderId}`, { headers: authHeaders, cache: 'no-store' }),
        fetch('/api/auth/me', { headers: authHeaders, cache: 'no-store' }),
      ]);

      const orderResult = await orderResponse.json();
      const userResult = await userResponse.json();

      if (!orderResult.success) {
        setError(orderResult.error || '加载订单失败');
        return;
      }

      if (!userResult.success) {
        setError(userResult.error || '加载用户信息失败');
        return;
      }

      const order = orderResult.data;
      const accountResponse = await fetch(`/api/accounts/${order.accountId}`, {
        headers: authHeaders,
        cache: 'no-store',
      });
      const accountResult = await accountResponse.json();

      setCurrentUser({
        id: userResult.data.id,
        wechatOpenid: userResult.data.wechatOpenid,
      });

      if (order.status === 'paid') {
        setPaymentStatus('success');
        setPolling(true);
      } else if (order.status === 'completed') {
        router.push(`/orders/${orderId}`);
        return;
      }

      setOrderInfo({
        id: order.id,
        totalPrice: Number(order.totalPrice || 0),
        status: order.status,
        accountId: order.accountId,
        accountTitle: accountResult.data?.title,
        coinsM: accountResult.data?.coinsM,
        rentalDays: order.rentalDays,
      });
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

  async function checkOrderStatus() {
    try {
      const token = getToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const result = await response.json();

      if (result.success && (result.data.status === 'paid' || result.data.status === 'completed')) {
        setPolling(false);
        router.push(`/orders/${orderId}`);
      }
    } catch (statusError) {
      console.error('检查订单状态失败:', statusError);
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
        setError('当前账号未绑定微信 openid，暂时无法发起公众号支付');
        return;
      }

      if (!isWechat) {
        setError('请在微信内打开当前页面后再发起支付');
        return;
      }

      setCreatingPayment(true);
      setError(null);

      const createResponse = await fetch('/api/payment/wechat/jsapi/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          openid: currentUser.wechatOpenid,
        }),
      });

      const createResult = await createResponse.json();
      if (!createResult.success) {
        setError(createResult.error || '创建支付失败');
        return;
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

  if (error && !orderInfo) {
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
      <div className="max-w-md mx-auto">
        {paymentStatus === 'success' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">支付请求已提交</h2>
                <p className="text-slate-600 mb-6">正在确认订单状态，稍后会自动跳转到订单详情。</p>
                <Button onClick={() => router.push(`/orders/${orderId}`)} className="w-full">
                  查看订单
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

        {paymentStatus === 'idle' && orderInfo && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  微信支付
                </CardTitle>
                <CardDescription>请在微信内完成本次订单支付</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">订单信息</div>
                  <div className="font-bold text-slate-900 mb-1">
                    {orderInfo.accountTitle || '数字资产托管服务'}
                  </div>
                  <div className="text-sm text-slate-600">
                    {orderInfo.coinsM ?? '--'}M · {orderInfo.rentalDays ?? '--'} 天
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">订单号</span>
                  <span className="text-slate-900 font-mono">{orderInfo.id.slice(0, 16)}...</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900">支付金额</span>
                    <span className="text-2xl font-bold text-red-600">¥{orderInfo.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isWechat && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>当前不是微信内置浏览器</AlertTitle>
                <AlertDescription>JSAPI 支付只能在微信内打开当前页面后发起。</AlertDescription>
              </Alert>
            )}

            {currentUser && !currentUser.wechatOpenid && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>当前账号未绑定微信</AlertTitle>
                <AlertDescription>请先用微信授权登录同一账号，或在测试域名环境中完成公众号授权后再发起支付。</AlertDescription>
              </Alert>
            )}

            {(sdkError || configuringSdk || sdkLoading) && isWechat && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>微信支付环境</AlertTitle>
                <AlertDescription>
                  {sdkError || (configuringSdk ? '正在初始化微信支付环境...' : '正在加载微信 SDK...')}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>支付提示</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="mb-6">
              <CreditCard className="h-4 w-4" />
              <AlertTitle>联调说明</AlertTitle>
              <AlertDescription>
                当前页面已经接到真实支付创建接口。正式联调时，需要在微信内用已绑定 openid 的账号打开，并保证测试域名已完成公众号支付配置。
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => void handlePayment()}
              disabled={creatingPayment || paying || !isWechat || !currentUser?.wechatOpenid || configuringSdk || sdkLoading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {creatingPayment || paying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在发起支付...
                </>
              ) : (
                '立即支付'
              )}
            </Button>

            <div className="mt-4">
              <Button variant="outline" onClick={() => router.back()} className="w-full">
                返回
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WechatJSAPIPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600">正在加载支付页面...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <WechatJSAPIPaymentContent />
    </Suspense>
  );
}
