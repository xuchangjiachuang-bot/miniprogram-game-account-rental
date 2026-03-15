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
  checkJsApiError?: string;
  createPaymentPayload?: unknown;
  createPaymentResponse?: unknown;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type PaymentMode = 'order' | 'recharge';

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
      error: response.ok ? '接口暂时返回了非 JSON 响应，请稍后重试' : `请求失败，状态码 ${response.status}`,
    };
  }

  return response.json();
}

function WechatJSAPIPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const rechargeId = searchParams.get('rechargeId');
  const rechargeAmount = searchParams.get('rechargeAmount');
  const mode: PaymentMode = orderId ? 'order' : 'recharge';
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

  useEffect(() => {
    setCurrentRechargeId(rechargeId || '');
  }, [rechargeId]);

  useEffect(() => {
    if (!isDesktopWechat) {
      return;
    }

    const params = new URLSearchParams();
    if (orderId) {
      params.set('orderId', orderId);
    }
    if (currentRechargeId) {
      params.set('rechargeId', currentRechargeId);
    } else if (rechargeAmount) {
      params.set('rechargeAmount', rechargeAmount);
    }

    const target = `/payment/wechat/native${params.toString() ? `?${params.toString()}` : ''}`;
    setDesktopRedirecting(true);
    router.replace(target);
  }, [currentRechargeId, isDesktopWechat, orderId, rechargeAmount, router]);

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

  function getWechatPayFailMessage(payError: any) {
    const errMsg = String(payError?.errMsg || payError?.message || '').toLowerCase();

    if (errMsg.includes('cancel')) {
      return '你已取消支付';
    }

    if (errMsg.includes('config:invalid') || errMsg.includes('config fail')) {
      return '微信支付环境初始化失败，请稍后重试';
    }

    if (errMsg.includes('permission denied')) {
      return '微信返回 chooseWXPay:permission denied，请检查公众号支付权限、JS 接口安全域名、支付授权目录以及商户号与 AppID 绑定关系。';
    }

    if (errMsg.includes('choosewxpay:fail')) {
      return `微信支付调起失败：${payError?.errMsg || '未知错误'}`;
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

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const userResponse = await fetch('/api/auth/me', { headers: authHeaders, cache: 'no-store' });
      const userResult = await parseJsonResponse<CurrentUserInfo & { id: string; wechatOpenid: string | null }>(userResponse);
      if (!userResult.success || !userResult.data) {
        setError(userResult.error || '加载用户信息失败');
        return;
      }

      setCurrentUser({
        id: userResult.data.id,
        wechatOpenid: userResult.data.wechatOpenid,
      });

      if (mode === 'order' && orderId) {
        const orderResponse = await fetch(`/api/orders/${orderId}`, { headers: authHeaders, cache: 'no-store' });
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

        if (['paid', 'completed'].includes(orderResult.data.status || '')) {
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
          const rechargeResult = await parseJsonResponse<RechargeInfo>(rechargeResponse);

          if (!rechargeResult.success || !rechargeResult.data) {
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
        throw new Error('当前公众号或当前网页环境未获得 chooseWXPay 权限，请检查微信 JS 接口安全域名、支付授权目录及商户号绑定关系');
      }

      setPaymentPermissionReady(true);
    } catch (sdkConfigError: any) {
      const message = sdkConfigError?.message || 'WECHAT_JSAPI_SETUP_FAILED';
      setJsapiDebug((current) => ({
        ...current,
        sdkConfigStatus: 'failed',
        sdkConfigError: message,
        checkJsApiError: message.includes('WECHAT_JSAPI_CHECK_API_FAILED') ? message : current.checkJsApiError,
      }));
      setError(message);
    } finally {
      setConfiguringSdk(false);
    }
  }

  async function checkPaymentStatus() {
    try {
      const token = getToken();
      if (!token) {
        return false;
      }

      if (mode === 'order' && orderId) {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const result = await parseJsonResponse<any>(response);

        if (result.success && result.data && ['paid', 'completed'].includes(result.data.status || '')) {
          setPolling(false);
          router.push(`/orders/${orderId}`);
          return true;
        }
      }

      if (mode === 'recharge' && currentRechargeId) {
        const response = await fetch(`/api/payment/recharge/${currentRechargeId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const result = await parseJsonResponse<any>(response);

        if (result.success && result.data?.status === 'success') {
          setPolling(false);
          router.push('/user-center');
          return true;
        }
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
        setError('微信支付权限尚未准备完成，请先检查公众号支付授权配置');
        return;
      }

      setCreatingPayment(true);
      setError(null);

      const endpoint = mode === 'order'
        ? '/api/payment/wechat/jsapi/create'
        : '/api/payment/wechat/jsapi/recharge/create';
      const payload = mode === 'order'
        ? { orderId, openid: currentUser.wechatOpenid }
        : { amount: Number(rechargeInfo?.amount || rechargeAmount || 0), openid: currentUser.wechatOpenid };

      setJsapiDebug((current) => ({
        ...current,
        createPaymentPayload: {
          endpoint,
          payload,
        },
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

  const title = mode === 'order' ? '微信订单支付' : '微信钱包充值';
  const amount = mode === 'order'
    ? Number(orderInfo?.totalPrice || 0)
    : Number(rechargeInfo?.amount || rechargeAmount || 0);
  const bindWechatUrl = typeof window === 'undefined'
    ? '/api/auth/wechat/authorize?state=payment_bind'
    : `/api/auth/wechat/authorize?state=payment_bind&returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;

  if (desktopRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>请在微信内完成支付确认</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>正在准备支付环境</AlertTitle>
                <AlertDescription>当前是桌面微信环境，正在自动切换到扫码支付页面。</AlertDescription>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        {paymentStatus === 'success' ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
                <h2 className="mb-2 text-2xl font-bold text-slate-900">支付请求已提交</h2>
                <p className="mb-6 text-slate-600">正在确认支付状态，稍后会自动跳转。</p>
                <Button
                  onClick={() => router.push(mode === 'order' && orderId ? `/orders/${orderId}` : '/user-center')}
                  className="w-full"
                >
                  {mode === 'order' ? '查看订单' : '返回钱包'}
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
              <CardTitle>{title}</CardTitle>
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
                  <AlertDescription>当前页面已进入微信，但 chooseWXPay 权限没有通过检测，请优先检查公众号支付配置。</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>支付提示</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {isWechat ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">JSAPI Debug</div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-slate-700">
                    {JSON.stringify(jsapiDebug, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">{mode === 'order' ? '订单金额' : '充值金额'}</div>
                <div className="text-3xl font-bold text-slate-900">¥{amount.toFixed(2)}</div>
              </div>

              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={creatingPayment || paying || !isWechat || !currentUser?.wechatOpenid || configuringSdk || sdkLoading || !paymentPermissionReady}
              >
                {(creatingPayment || paying) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                立即微信支付
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
