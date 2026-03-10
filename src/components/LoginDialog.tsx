'use client';

import { useEffect, useState } from 'react';
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

const validatePhone = (phone: string): boolean => /^1[3-9]\d{9}$/.test(phone);
const validateCode = (code: string): boolean => /^\d{6}$/.test(code);

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

          await refreshUser();
          setOpen(false);
          onSuccess?.();
        }
      } catch (pollError) {
        console.error('[微信登录] 检查登录状态失败:', pollError);
      }
    }, 1000);

    setPollingInterval(interval);
  };

  const generateWechatQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      setWechatUnavailableMessage('');
      setWechatConfig(null);
      clearPolling();

      const configResponse = await fetch('/api/auth/wechat/config');
      const configResult = await configResponse.json();

      if (!configResult.success) {
        const message =
          configResult.error || '当前环境暂时无法使用微信登录，请稍后再试。';
        setWechatUnavailableMessage(message);
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
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'wechat_login_success') {
        clearPolling();

        if (event.data.token) {
          setToken(event.data.token);
        }

        refreshUser().then(() => {
          setOpen(false);
          onSuccess?.();
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, refreshUser, setOpen, pollingInterval]);

  useEffect(() => {
    if (open) {
      generateWechatQrCode();
    } else {
      clearPolling();
      setWechatConfig(null);
      setWechatUnavailableMessage('');
      setError('');
      setSuccess('');
    }

    return () => {
      clearPolling();
    };
  }, [open]);

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

      if (data.success) {
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
      } else {
        setError(data.error || '发送验证码失败');
      }
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

      if (data.success) {
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
      } else {
        setError(data.error || '登录失败');
      }
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

    window.location.href = '/api/auth/wechat/authorize?state=login';
  };

  const defaultTrigger = (
    <Button
      variant="default"
      size="sm"
      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-medium"
    >
      登录 / 注册
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">欢迎登录</DialogTitle>
          <DialogDescription>
            你可以使用手机号验证码登录；新用户会自动完成注册。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="wechat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wechat">
              <QrCode className="mr-2 h-4 w-4" />
              微信扫码
            </TabsTrigger>
            <TabsTrigger value="phone">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown} 秒后重发` : '发送验证码'}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录 / 注册'}
            </Button>
          </TabsContent>

          <TabsContent value="wechat" className="space-y-4">
            {isWechatBrowser ? (
              <div className="flex flex-col items-center justify-center py-8">
                <QrCode className="mb-4 h-16 w-16 text-green-600" />
                <p className="mb-4 text-sm text-gray-500">点击下方按钮，使用微信授权登录</p>
                {wechatUnavailableMessage && (
                  <Alert className="mb-4 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{wechatUnavailableMessage}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="button"
                  className="mt-2 cursor-pointer bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                  onClick={handleWechatLogin}
                  disabled={loading || !!wechatUnavailableMessage}
                >
                  {loading ? '授权中...' : '微信授权登录'}
                </Button>
              </div>
            ) : wechatUnavailableMessage ? (
              <div className="w-full space-y-4 py-8">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{wechatUnavailableMessage}</AlertDescription>
                </Alert>
                <p className="text-center text-sm text-gray-500">
                  本地开发阶段可以先用手机号登录。等测试域名和微信回调配置完成后，我们再一起联调微信授权。
                </p>
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
                    onClick={generateWechatQrCode}
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
                <Button onClick={generateWechatQrCode} disabled={loading} variant="outline" className="mt-4">
                  重试
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
