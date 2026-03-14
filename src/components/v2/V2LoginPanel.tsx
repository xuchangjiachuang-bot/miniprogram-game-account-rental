'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, QrCode, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface V2LoginConfigResponse {
  success: boolean;
  data?: {
    pc?: { enabled: boolean; appId: string; issues: string[] };
    oauth?: { enabled: boolean; appId: string; issues: string[] };
    callbackUri?: string;
    buildMarker?: string;
  };
}

export function V2LoginPanel() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<V2LoginConfigResponse['data'] | null>(null);

  const returnTo = useMemo(() => {
    const next = searchParams.get('returnTo');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  }, [searchParams]);

  const isWechatBrowser =
    typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/v2/auth/wechat/config', { cache: 'no-store' });
        const result = (await response.json()) as V2LoginConfigResponse;

        if (!active) {
          return;
        }

        if (!response.ok || !result.success || !result.data) {
          throw new Error('V2_LOGIN_CONFIG_FAILED');
        }

        setConfig(result.data);
      } catch (requestError: any) {
        if (!active) {
          return;
        }

        setError(requestError.message || 'V2_LOGIN_CONFIG_FAILED');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      active = false;
    };
  }, []);

  function startLogin(kind: 'pc' | 'oauth') {
    window.location.href = `/api/v2/auth/wechat/authorize?kind=${kind}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">V2 微信登录</CardTitle>
            <CardDescription>这是重建版第一阶段，只保留 PC 扫码和微信内授权两条登录入口。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : null}

            {!loading && error ? (
              <Alert variant="destructive">
                <AlertTitle>加载失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!loading && config ? (
              <>
                <Alert>
                  <AlertTitle>构建标记</AlertTitle>
                  <AlertDescription>{config.buildMarker || 'missing-build-marker'}</AlertDescription>
                </Alert>

                <Alert>
                  <AlertTitle>回调地址</AlertTitle>
                  <AlertDescription>{config.callbackUri}</AlertDescription>
                </Alert>

                <div className="space-y-3 rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4" />
                    PC 浏览器登录
                  </div>
                  <p className="text-sm text-slate-500">只走开放平台扫码登录。</p>
                  <Button className="w-full" onClick={() => startLogin('pc')} disabled={!config.pc?.enabled}>
                    打开微信官方扫码登录
                  </Button>
                  {!config.pc?.enabled ? (
                    <p className="text-xs text-red-600">{(config.pc?.issues || []).join(', ') || 'PC config disabled'}</p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4" />
                    微信浏览器登录
                  </div>
                  <p className="text-sm text-slate-500">只走公众号 OAuth 授权登录。</p>
                  <Button className="w-full" variant={isWechatBrowser ? 'default' : 'outline'} onClick={() => startLogin('oauth')} disabled={!config.oauth?.enabled}>
                    微信内授权登录
                  </Button>
                  {!config.oauth?.enabled ? (
                    <p className="text-xs text-red-600">{(config.oauth?.issues || []).join(', ') || 'OAuth config disabled'}</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
