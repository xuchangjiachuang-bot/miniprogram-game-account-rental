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

interface JsapiDebugState {
  pageUrl?: string;
  signatureRequestUrl?: string;
  signatureResponse?: unknown;
  signatureNormalizedUrl?: string;
  sdkConfigStatus?: 'idle' | 'loading' | 'ready' | 'failed';
  sdkConfigError?: string;
  checkJsApiResult?: unknown;
  createPaymentPayload?: unknown;
  createPaymentResponse?: unknown;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

const SHOW_JSAPI_DEBUG = process.env.NEXT_PUBLIC_SHOW_WECHAT_JSAPI_DEBUG === 'true';

async function parseJsonResponse<T>(response: Response): Promise<ApiResult<T>> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('[wechat-jsapi] expected JSON response but received:', {
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

function WechatJSAPIPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyOrderId = searchParams.get('orderId');
  const payOrderId = searchParams.get('payOrderId');
  const rechargeId = searchParams.get('rechargeId');
  const rechargeAmount = searchParams.get('rechargeAmount');
  const orderPaymentDisabled = Boolean(legacyOrderId);
  const {
    loaded,
    loading: sdkLoading,
    error: sdkError,
    isWechat,
    isDesktopWechat,
    configWechatSDK,
    checkPaymentPermission,
  } = useWechatJSAPI();

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
  const [paymentPermissionReady, setPaymentPermissionReady] = useState(false);
  const [jsapiDebug, setJsapiDebug] = useState<JsapiDebugState>({});
  const [desktopRedirecting, setDesktopRedirecting] = useState(false);
  const [finalizingOrder, setFinalizingOrder] = useState(false);

  const amount = orderPaymentDisabled
    ? Number(orderInfo?.totalPrice || 0)
    : Number(rechargeInfo?.amount || rechargeAmount || 0);

  useEffect(() => {
    setCurrentRechargeId(rechargeId || '');
  }, [rechargeId]);

  useEffect(() => {
    if (!isDesktopWechat || orderPaymentDisabled) {
      return;
    }

    const params = new URLSearchParams();
    if (currentRechargeId) {
      params.set('rechargeId', currentRechargeId);
    } else if (rechargeAmount) {
      params.set('rechargeAmount', rechargeAmount);
    }
    if (payOrderId) {
      params.set('payOrderId', payOrderId);
    }

    const target = `/payment/wechat/native${params.toString() ? `?${params.toString()}` : ''}`;
    setDesktopRedirecting(true);
    router.replace(target);
  }, [currentRechargeId, isDesktopWechat, orderPaymentDisabled, payOrderId, rechargeAmount, router]);

  useEffect(() => {
    if (!orderPaymentDisabled && !currentRechargeId && !rechargeAmount) {
      setError('缺少充值参数');
      setLoading(false);
      return;
    }

    void loadInitialData();
  }, [currentRechargeId, legacyOrderId, orderPaymentDisabled, rechargeAmount]);

  useEffect(() => {
    if (orderPaymentDisabled || !isWechat || !loaded || paymentStatus !== 'idle') {
      return;
    }

    if (!rechargeInfo && !rechargeAmount) {
      return;
    }

    void setupWechatSdk();
  }, [isWechat, loaded, orderPaymentDisabled, paymentStatus, rechargeAmount, rechargeInfo]);

  useEffect(() => {
    if (paymentStatus !== 'success' || !polling || orderPaymentDisabled) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkPaymentStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [currentRechargeId, orderPaymentDisabled, paymentStatus, polling]);

  function getWechatPayFailMessage(payError: any) {
    const errMsg = String(payError?.errMsg || payError?.message || '').toLowerCase();

    if (errMsg.includes('cancel')) {
      return '你已取消支付';
    }

    if (errMsg.includes('config:invalid') || errMsg.includes('config fail')) {
      return '微信支付环境初始化失败，请稍后重试';
    }

    if (errMsg.includes('permission denied')) {
      return '微信返回 chooseWXPay:permission denied，请检查公众号支付权限和 JSAPI 配置。';
    }

    if (errMsg.includes('choosewxpay:fail')) {
      return payError?.errMsg || '微信支付拉起失败';
    }

    return payError?.errMsg || payError?.message || '支付未完成，请重试';
  }

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);
      setPaymentPermissionReady(false);
      setJsapiDebug({});

      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const userResponse = await fetch('/api/auth/me', { headers, cache: 'no-store' });
      const userResult = await parseJsonResponse<CurrentUserInfo>(userResponse);
      if (!userResult.success || !userResult.data) {
        setError(userResult.error || '加载用户信息失败');
        return;
      }

      setCurrentUser(userResult.data);

      if (orderPaymentDisabled && legacyOrderId) {
        const orderResponse = await fetch(`/api/orders/${legacyOrderId}`, { headers, cache: 'no-store' });
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

  async function setupWechatSdk() {
    try {
      const pageUrl = window.location.href;

      setConfiguringSdk(true);
      setError(null);
      setPaymentPermissionReady(false);
      setJsapiDebug({
        pageUrl,
        signatureRequestUrl: pageUrl,
        sdkConfigStatus: 'loading',
      });

      const signatureResponse = await fetch(`/api/wechat/jsapi-signature?url=${encodeURIComponent(pageUrl)}`);
      const signatureResult = await parseJsonResponse<any>(signatureResponse);
      setJsapiDebug((current) => ({
        ...current,
        signatureResponse: signatureResult,
        signatureNormalizedUrl: signatureResult?.data?.debug?.normalizedUrl,
      }));

      if (!signatureResult.success || !signatureResult.data) {
        throw new Error(signatureResult.error || '获取微信支付签名失败');
      }

      const { appId, timestamp, nonceStr, signature } = signatureResult.data;
      await configWechatSDK(appId, timestamp, nonceStr, signature);
      setJsapiDebug((current) => ({
        ...current,
        sdkConfigStatus: 'ready',
      }));

      const permissionResult = await checkPaymentPermission();
      setJsapiDebug((current) => ({
        ...current,
        checkJsApiResult: permissionResult,
      }));

      if (!permissionResult.chooseWXPay || permissionResult.chooseWXPay === 'false') {
        throw new Error('当前页面没有通过 chooseWXPay 权限检测，请检查公众号支付配置。');
      }

      setPaymentPermissionReady(true);
    } catch (sdkConfigError: any) {
      const message = sdkConfigError?.message || 'WECHAT_JSAPI_SETUP_FAILED';
      setJsapiDebug((current) => ({
        ...current,
        sdkConfigStatus: 'failed',
        sdkConfigError: message,
      }));
      setError(message);
    } finally {
      setConfiguringSdk(false);
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
        return false;
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
        return true;
      }

      if (result.success && result.data?.status === 'failed') {
        setPolling(false);
        setPaymentStatus('failed');
        setError(result.data.failureReason || '微信支付未成功，请重新发起充值');
      } else if (!result.success) {
        setError(result.error || '检查充值状态失败');
      }
    } catch (statusError) {
      console.error('[wechat-jsapi] check payment status failed:', statusError);
    }

    return false;
  }

  async function handlePayment() {
    try {
      const token = getToken();
      if (!token) {
        setError('请先登录后再发起支付');
        return;
      }

      if (!currentUser?.wechatOpenid) {
        setError('当前账号缺少微信 openid，无法发起微信支付');
        return;
      }

      if (!isWechat) {
        setError('请在微信内打开当前页面后再发起支付');
        return;
      }

      if (!paymentPermissionReady) {
        setError('微信支付权限尚未准备完成，请先检查公众号支付配置');
        return;
      }

      setCreatingPayment(true);
      setError(null);

      const endpoint = '/api/payment/wechat/jsapi/recharge/create';
      const payload = {
        amount: Number(rechargeInfo?.amount || rechargeAmount || 0),
        openid: currentUser.wechatOpenid,
      };

      setJsapiDebug((current) => ({
        ...current,
        createPaymentPayload: { endpoint, payload },
      }));

      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const createResult = await parseJsonResponse<any>(createResponse);
      setJsapiDebug((current) => ({
        ...current,
        createPaymentResponse: createResult,
      }));

      if (!createResult.success || !createResult.data) {
        setError(createResult.message || createResult.error || '创建支付失败');
        return;
      }

      if (createResult.data.rechargeId) {
        setCurrentRechargeId(createResult.data.rechargeId);
        setRechargeInfo((current) => ({
          id: createResult.data.rechargeId,
          amount: Number(createResult.data.amount || current?.amount || 0),
          status: 'pending',
        }));
        const nextParams = new URLSearchParams({ rechargeId: createResult.data.rechargeId });
        if (payOrderId) {
          nextParams.set('payOrderId', payOrderId);
        }
        window.history.replaceState({}, '', `/payment/wechat/jsapi?${nextParams.toString()}`);
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
          void checkPaymentStatus();
        },
        fail: (payError: any) => {
          console.error('[wechat-jsapi] chooseWXPay failed:', payError);
          setPaymentStatus('failed');
          setError(getWechatPayFailMessage(payError));
          window.setTimeout(() => {
            void checkPaymentStatus();
          }, 1500);
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

  const bindWechatUrl = typeof window === 'undefined'
    ? '/api/auth/wechat/authorize?state=payment_bind'
    : `/api/auth/wechat/authorize?state=payment_bind&returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;

  if (desktopRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>微信钱包充值</CardTitle>
              <CardDescription>请在微信内完成支付确认</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>正在准备支付环境</AlertTitle>
                <AlertDescription>当前是桌面微信环境，正在自动切换到扫码充值页面。</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 pt-6">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
            <p className="text-slate-600">正在加载支付信息...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !orderInfo && !rechargeInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
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
              <CardDescription>微信 JSAPI 现在只用于钱包充值，订单不能再直接发起微信支付。</CardDescription>
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

              <div className="space-y-2">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        {paymentStatus === 'success' ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
                <h2 className="mb-2 text-2xl font-bold text-slate-900">充值成功</h2>
                <p className="mb-6 text-slate-600">
                  {payOrderId ? '正在自动支付当前订单，完成后会自动跳转。' : '正在确认支付状态，稍后会自动跳转。'}
                </p>
                <Button onClick={() => router.push(payOrderId ? `/orders/${payOrderId}` : '/user-center?tab=wallet')} className="w-full">
                  {payOrderId ? '返回订单页' : '返回钱包'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {paymentStatus === 'failed' ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="mx-auto mb-4 h-16 w-16 text-red-600" />
                <h2 className="mb-2 text-2xl font-bold text-slate-900">支付未完成</h2>
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Button onClick={() => { setPaymentStatus('idle'); setError(null); }} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新发起支付
                  </Button>
                  <Button onClick={() => router.back()} variant="outline" className="w-full">
                    返回
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {paymentStatus === 'idle' ? (
          <Card>
            <CardHeader>
              <CardTitle>微信钱包充值</CardTitle>
              <CardDescription>请在微信内完成支付确认</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isWechat ? (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>请在微信内打开</AlertTitle>
                  <AlertDescription>JSAPI 支付只能在微信内打开当前页面后发起。</AlertDescription>
                </Alert>
              ) : null}

              {currentUser && !currentUser.wechatOpenid ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>请先完成微信授权绑定</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>当前账号尚未绑定微信 openid，暂时无法发起 JSAPI 支付。</p>
                    <Button type="button" size="sm" onClick={() => { window.location.href = bindWechatUrl; }}>
                      去微信授权
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {(sdkError || configuringSdk || sdkLoading) && isWechat ? (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>正在准备支付环境</AlertTitle>
                  <AlertDescription>{sdkError || '正在初始化微信支付环境...'}</AlertDescription>
                </Alert>
              ) : null}

              {isWechat && !configuringSdk && !sdkLoading && !sdkError && !paymentPermissionReady ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>微信支付权限未就绪</AlertTitle>
                  <AlertDescription>当前页面已进入微信，但 chooseWXPay 权限检测未通过，请检查公众号支付配置。</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>支付提示</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {SHOW_JSAPI_DEBUG && isWechat ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">JSAPI Debug</div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-slate-700">
                    {JSON.stringify(jsapiDebug, null, 2)}
                  </pre>
                </div>
              ) : null}

              {finalizingOrder && payOrderId ? (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>正在自动支付订单</AlertTitle>
                  <AlertDescription>充值已到账，系统正在自动完成当前订单支付。</AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">充值金额</div>
                <div className="text-3xl font-bold text-slate-900">¥{amount.toFixed(2)}</div>
              </div>

              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={creatingPayment || paying || !isWechat || !currentUser?.wechatOpenid || configuringSdk || sdkLoading || !paymentPermissionReady}
              >
                {(creatingPayment || paying) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {payOrderId ? '立即充值并支付订单' : '立即微信支付'}
              </Button>
            </CardContent>
          </Card>
        ) : null}
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
