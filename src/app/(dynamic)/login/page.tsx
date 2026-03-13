'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import WechatQrLogin from '@/components/WechatQrLogin';
import { setToken } from '@/lib/auth-token';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WechatLoginConfig {
  appId: string;
  redirectUri: string;
  state: string;
}

function LoginForm() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const error = searchParams.get('error');
  const reason = searchParams.get('reason');
  const returnTo = searchParams.get('returnTo');
  const isWechatBrowser = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sms' | 'wechat'>('wechat');
  const [formData, setFormData] = useState({ phone: '', code: '' });
  const [wechatConfig, setWechatConfig] = useState<WechatLoginConfig | null>(null);
  const [wechatUnavailableMessage, setWechatUnavailableMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }

    if (error === 'wechat_auth_failed') {
      toast.error(reason ? decodeURIComponent(reason) : '微信授权登录失败，请重试');
    } else {
      toast.error(decodeURIComponent(error));
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('error');
    nextParams.delete('reason');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [error, pathname, reason, router, searchParams]);

  useEffect(() => {
    if (userLoading || !user) {
      return;
    }

    const safeReturnTo =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/';

    router.replace(safeReturnTo);
  }, [returnTo, router, user, userLoading]);

  useEffect(() => {
    if (isWechatBrowser && activeTab !== 'wechat') {
      setActiveTab('wechat');
    }
  }, [activeTab, isWechatBrowser]);

  const clearPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const startPolling = (state: string) => {
    clearPolling();

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/wechat/check-login?state=${encodeURIComponent(state)}`);
        const data = await response.json();

        if (data.success && data.loggedIn) {
          clearInterval(interval);
          setPollingInterval(null);

          if (data.token) {
            setToken(data.token);
          }

          toast.success('登录成功');
          router.push('/');
        }
      } catch (pollError) {
        console.error('[微信登录] 检查扫码登录状态失败:', pollError);
      }
    }, 2000);

    setPollingInterval(interval);
  };

  const generateWechatQrCode = async () => {
    try {
      setLoading(true);
      setWechatConfig(null);
      setWechatUnavailableMessage('');
      clearPolling();

      const configResponse = await fetch('/api/auth/wechat/config');
      const configResult = await configResponse.json();

      if (!configResult.success) {
        setWechatUnavailableMessage(configResult.error || '当前环境暂时无法使用微信登录，请稍后再试。');
        return;
      }

      const { appId, redirectUri } = configResult.data || {};
      if (!appId || !redirectUri) {
        setWechatUnavailableMessage('微信登录配置不完整，请稍后再试。');
        return;
      }

      const state = `login_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setWechatConfig({ appId, redirectUri, state });
      startPolling(state);
    } catch (requestError: any) {
      setWechatUnavailableMessage(
        requestError?.message
          ? `生成微信二维码失败：${requestError.message}`
          : '生成微信二维码失败，请稍后再试。'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wechat') {
      void generateWechatQrCode();
    } else {
      clearPolling();
    }

    return () => {
      clearPolling();
    };
  }, [activeTab]);

  const handleLogin = async () => {
    if (!formData.phone) {
      toast.error('请输入手机号');
      return;
    }

    if (!formData.code) {
      toast.error('请输入验证码');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: formData.phone,
          code: formData.code,
        }),
      });

      const result = await response.json();

      if (result.success && result.token) {
        setToken(result.token);
        toast.success('登录成功');
        router.push('/');
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (loginError: any) {
      toast.error(loginError?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      toast.error('请输入手机号');
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-code',
          phone: formData.phone,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('验证码已发送');
      } else {
        throw new Error(result.error || '发送失败');
      }
    } catch (sendError: any) {
      toast.error(sendError?.message || '发送失败，请重试');
    }
  };

  const handleWechatAuthorizeLogin = () => {
    const safeReturnTo =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/';

    window.location.href = `/api/auth/wechat/authorize?state=wechat_oauth&returnTo=${encodeURIComponent(safeReturnTo)}`;
  };

  if (userLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            登录
          </CardTitle>
          <CardDescription>欢迎回来，请登录你的账户</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isWechatBrowser ? (
            <div className="space-y-4">
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                <div className="text-center">
                  <QrCode className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                </div>
                <Button
                  type="button"
                  className="w-full cursor-pointer bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700"
                  onClick={handleWechatAuthorizeLogin}
                  disabled={loading}
                >
                  微信授权登录
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sms' | 'wechat')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wechat">
                  <QrCode className="mr-2 h-4 w-4" />
                  微信扫码
                </TabsTrigger>
                <TabsTrigger value="sms">
                  <Smartphone className="mr-2 h-4 w-4" />
                  短信登录
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wechat" className="space-y-4 pt-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  {wechatUnavailableMessage ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>{wechatUnavailableMessage}</AlertDescription>
                      </Alert>
                    </div>
                  ) : wechatConfig ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <WechatQrLogin
                          appId={wechatConfig.appId}
                          redirectUri={wechatConfig.redirectUri}
                          state={wechatConfig.state}
                          width={300}
                          height={400}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-600">请使用微信扫描二维码登录</p>
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void generateWechatQrCode()}
                          disabled={loading}
                          className="flex items-center gap-2"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          刷新二维码
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400" />
                      <p className="text-gray-500">正在加载二维码...</p>
                      <Button
                        onClick={() => void generateWechatQrCode()}
                        disabled={loading}
                        variant="outline"
                        className="mt-4"
                      >
                        重试
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入手机号"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="请输入验证码"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={loading || !formData.phone}
                    >
                      发送验证码
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? '登录中...' : '登录 / 注册'}
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {!isWechatBrowser && (
            <div className="text-center text-sm text-gray-500">
              还没有账户？
              <span className="ml-1 font-medium text-blue-600">短信登录即注册</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
