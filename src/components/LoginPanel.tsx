'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import {
  createWechatOauthState,
  fetchWechatLoginConfig,
  resolveLoginReturnTo,
  type WechatLoginConfigData,
} from '@/lib/wechat-login-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LoginPanelMode = 'page' | 'dialog';

interface LoginPanelProps {
  mode: LoginPanelMode;
  onClose?: () => void;
  onSuccess?: () => void;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function LoginPanel({ mode, onClose, onSuccess }: LoginPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const [isBrowserReady, setIsBrowserReady] = useState(false);
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wechatConfig, setWechatConfig] = useState<WechatLoginConfigData | null>(null);
  const [wechatUnavailableMessage, setWechatUnavailableMessage] = useState('');

  const errorQuery = mode === 'page' ? searchParams.get('error') : null;
  const reasonQuery = mode === 'page' ? searchParams.get('reason') : null;

  const returnTo = useMemo(() => {
    if (mode === 'page') {
      return resolveLoginReturnTo(searchParams.get('returnTo'));
    }

    if (typeof window === 'undefined') {
      return '/';
    }

    return resolveLoginReturnTo(`${window.location.pathname}${window.location.search}`);
  }, [mode, searchParams]);

  const loadWechatQrConfig = useCallback(async () => {
    if (isWechatBrowser) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setWechatUnavailableMessage('');
      setWechatConfig(null);

      const nextConfig = await fetchWechatLoginConfig(returnTo);
      setWechatConfig(nextConfig);
    } catch (error) {
      setWechatUnavailableMessage(getErrorMessage(error, '当前环境暂时无法使用微信扫码登录'));
    } finally {
      setLoading(false);
    }
  }, [isWechatBrowser, returnTo]);

  useEffect(() => {
    setIsBrowserReady(true);
    setIsWechatBrowser(/MicroMessenger/i.test(window.navigator.userAgent));
  }, []);

  useEffect(() => {
    if (mode !== 'page' || !errorQuery) {
      return;
    }

    const message =
      errorQuery === 'wechat_auth_failed'
        ? reasonQuery
          ? decodeURIComponent(reasonQuery)
          : '微信授权登录失败，请重试'
        : decodeURIComponent(errorQuery);

    toast.error(message);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('error');
    nextParams.delete('reason');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [errorQuery, mode, pathname, reasonQuery, router, searchParams]);

  useEffect(() => {
    if (userLoading || !user) {
      return;
    }

    if (mode === 'dialog') {
      onClose?.();
      onSuccess?.();
      return;
    }

    router.replace(returnTo);
  }, [mode, onClose, onSuccess, returnTo, router, user, userLoading]);

  useEffect(() => {
    if (!isBrowserReady || isWechatBrowser) {
      return;
    }

    void loadWechatQrConfig();
  }, [isBrowserReady, isWechatBrowser, loadWechatQrConfig]);

  const handleWechatAuthorizeLogin = () => {
    setLoading(true);
    const oauthState = createWechatOauthState(returnTo);
    window.location.href = `/api/auth/wechat/authorize?state=${encodeURIComponent(oauthState)}&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleWechatPcLogin = () => {
    if (!wechatConfig?.loginUrl) {
      toast.error('微信扫码登录配置尚未就绪，请稍后重试');
      return;
    }

    setLoading(true);
    window.location.href = wechatConfig.loginUrl;
  };

  const body = (
    <div className="space-y-6">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {!isBrowserReady ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : isWechatBrowser ? (
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
          <p className="text-center text-sm text-gray-500">当前在微信内打开，将直接完成授权登录。</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          {wechatUnavailableMessage ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>{wechatUnavailableMessage}</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => void loadWechatQrConfig()} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  重试
                </Button>
              </div>
            </div>
          ) : wechatConfig ? (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full cursor-pointer bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700"
                onClick={handleWechatPcLogin}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                打开微信扫码登录
              </Button>
              <p className="text-center text-sm text-gray-500">
                将跳转到微信官方扫码登录页，扫码确认后自动回到当前页面。
              </p>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadWechatQrConfig()}
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
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (mode === 'dialog') {
    return body;
  }

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
            微信登录
          </CardTitle>
          <CardDescription>电脑端请扫码，微信内打开时会直接走授权登录。</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
