'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Phone, QrCode, RefreshCw } from 'lucide-react';
import WechatQrLogin from '@/components/WechatQrLogin';
import { useUser } from '@/contexts/UserContext';
import { setToken } from '@/lib/auth-token';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LoginDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface WechatLoginConfig {
  appId: string;
  redirectUri: string;
  state: string;
}

const validatePhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone);
const validateCode = (code: string) => /^\d{6}$/.test(code);

export function LoginDialog({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: LoginDialogProps) {
  const { refreshUser } = useUser();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [activeTab, setActiveTab] = useState<'wechat' | 'phone'>('wechat');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);
  const [wechatConfig, setWechatConfig] = useState<WechatLoginConfig | null>(null);
  const [wechatUnavailableMessage, setWechatUnavailableMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsWechatBrowser(ua.includes('micromessenger'));
  }, []);

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

  const resetLoginState = () => {
    clearPolling();
    setWechatConfig(null);
    setWechatUnavailableMessage('');
    setError('');
    setSuccess('');
    setLoading(false);
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

          await refreshUser();
          setOpen(false);
          onSuccess?.();
        }
      } catch (pollError) {
        console.error('[微信登录] 检查扫码登录状态失败:', pollError);
      }
    }, 1000);

    setPollingInterval(interval);
  };

  const generateWechatQrCode = async () => {
    if (isWechatBrowser) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setWechatUnavailableMessage('');
      setWechatConfig(null);
      clearPolling();

      const configResponse = await fetch('/api/auth/wechat/config');
      const configResult = await configResponse.json();

      if (!configResult.success) {
        setWechatUnavailableMessage(configResult.error || '当前环境暂时无法使用微信扫码登录，请稍后再试。');
        return;
      }

      const { appId, redirectUri } = configResult.data || {};
      if (!appId || !redirectUri) {
        setWechatUnavailableMessage('微信扫码登录配置不完整，请稍后再试。');
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
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'wechat_login_success') {
        return;
      }

      clearPolling();

      if (event.data.token) {
        setToken(event.data.token);
      }

      void refreshUser().then(() => {
        setOpen(false);
        onSuccess?.();
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, refreshUser, setOpen]);

  useEffect(() => {
    if (!open) {
      resetLoginState();
      return;
    }

    if (isWechatBrowser || activeTab !== 'wechat') {
      clearPolling();
      setWechatConfig(null);
      setWechatUnavailableMessage('');
      return;
    }

    void generateWechatQrCode();

    return () => {
      clearPolling();
    };
  }, [activeTab, isWechatBrowser, open]);

  const handleSendCode = async () => {
    if (!validatePhone(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-code', phone }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '发送验证码失败');
        return;
      }

      setSuccess('验证码已发送');
      setCountdown(60);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } catch {
      setError('发送验证码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validatePhone(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    if (!validateCode(code)) {
      setError('请输入 6 位验证码');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', phone, code }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '登录失败');
        return;
      }

      if (data.token) {
        setToken(data.token);
      }

      setSuccess('登录成功');

      setTimeout(async () => {
        await refreshUser();
        setOpen(false);
        onSuccess?.();
        setSuccess('');
      }, 500);
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = () => {
    if (wechatUnavailableMessage) {
      setError(wechatUnavailableMessage);
      return;
    }

    const returnTo =
      typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/wechat/authorize?state=wechat_oauth&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const defaultTrigger = (
    <Button
      variant="default"
      size="sm"
      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 font-medium transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg"
    >
      登录 / 注册
    </Button>
  );

  const smsTabDisabled = isWechatBrowser;
  const dialogDescription = useMemo(() => {
    if (isWechatBrowser) {
      return null;
    }

    return '你可以使用手机号验证码登录；新用户会自动完成注册。';
  }, [isWechatBrowser]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">登录</DialogTitle>
          {dialogDescription ? <DialogDescription>{dialogDescription}</DialogDescription> : null}
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {isWechatBrowser ? (
          <div className="w-full py-8">
            <div className="flex flex-col items-center justify-center">
              <QrCode className="mb-4 h-16 w-16 text-green-600" />
              <Button
                type="button"
                className="mt-2 w-full cursor-pointer bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                onClick={handleWechatLogin}
                disabled={loading || !!wechatUnavailableMessage}
              >
                {loading ? '授权中...' : '微信授权登录'}
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'wechat' | 'phone')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wechat">
                <QrCode className="mr-2 h-4 w-4" />
                微信扫码
              </TabsTrigger>
              <TabsTrigger value="phone" disabled={smsTabDisabled}>
                <Phone className="mr-2 h-4 w-4" />
                手机号登录
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" onClick={handleSendCode} disabled={loading || countdown > 0}>
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </Button>
                </div>
              </div>

              <Button type="button" className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '登录'}
              </Button>
            </TabsContent>

            <TabsContent value="wechat" className="space-y-4">
              {wechatUnavailableMessage ? (
                <div className="w-full space-y-4 py-8">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{wechatUnavailableMessage}</AlertDescription>
                  </Alert>
                  <p className="text-center text-sm text-gray-500">当前环境暂时无法使用微信扫码登录，请先使用手机号登录。</p>
                </div>
              ) : wechatConfig ? (
                <div className="w-full space-y-4 py-8">
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
                <div className="w-full space-y-4 py-8 text-center">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400" />
                  <p className="text-gray-500">正在加载二维码...</p>
                  <Button onClick={() => void generateWechatQrCode()} disabled={loading} variant="outline" className="mt-4">
                    重试
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
