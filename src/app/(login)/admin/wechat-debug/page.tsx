'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, ExternalLink, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WechatConfig {
  appId: string;
  redirectUri: string;
}

interface ConfigResponse {
  success: boolean;
  enabled?: boolean;
  error?: string;
  message?: string;
  data?: Partial<WechatConfig>;
}

function createQrState() {
  return `login_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildQrLoginUrl(config: WechatConfig, state: string) {
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });

  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

function getWechatAuthorizeUrl() {
  return '/api/auth/wechat/authorize?state=debug_wechat_browser';
}

export default function WechatDebugPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WechatConfig | null>(null);
  const [error, setError] = useState('');
  const [qrState, setQrState] = useState(() => createQrState());

  const qrLoginUrl = useMemo(() => {
    if (!config) {
      return '';
    }

    return buildQrLoginUrl(config, qrState);
  }, [config, qrState]);

  async function loadConfig() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/wechat/config', {
        cache: 'no-store',
      });
      const result = (await response.json()) as ConfigResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || '获取微信登录配置失败');
      }

      const appId = result.data?.appId?.trim();
      const redirectUri = result.data?.redirectUri?.trim();
      if (!appId || !redirectUri) {
        throw new Error('微信登录配置不完整');
      }

      setConfig({ appId, redirectUri });
    } catch (loadError: any) {
      const message = loadError?.message || '获取微信登录配置失败';
      setConfig(null);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function copyText(value: string, label: string) {
    navigator.clipboard.writeText(value);
    toast.success(`${label}已复制`);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">微信登录调试</h1>
        <p className="text-sm text-muted-foreground">
          当前项目只保留两种登录入口：PC 浏览器扫码登录、微信浏览器授权登录。
        </p>
      </div>

      {error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>配置异常</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              当前配置
            </CardTitle>
            <CardDescription>读取 `/api/auth/wechat/config` 返回的有效配置。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Open Platform AppID</Label>
              <Input value={config?.appId || ''} readOnly placeholder="未加载到 AppID" />
            </div>
            <div className="space-y-2">
              <Label>回调地址</Label>
              <Input value={config?.redirectUri || ''} readOnly placeholder="未加载到回调地址" />
            </div>
            <Button type="button" variant="outline" onClick={() => void loadConfig()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新配置
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              PC 扫码登录
            </CardTitle>
            <CardDescription>电脑端展示二维码，手机微信扫码确认，回调写入当前登录状态。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>State</Label>
              <div className="flex gap-2">
                <Input value={qrState} readOnly />
                <Button type="button" variant="outline" onClick={() => setQrState(createQrState())}>
                  刷新
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>扫码 URL</Label>
              <Input value={qrLoginUrl} readOnly placeholder="请先加载配置" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!qrLoginUrl} onClick={() => copyText(qrLoginUrl, '扫码 URL')}>
                <Copy className="mr-2 h-4 w-4" />
                复制 URL
              </Button>
              <Button type="button" disabled={!qrLoginUrl} onClick={() => window.open(qrLoginUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                打开扫码页
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              微信浏览器授权登录
            </CardTitle>
            <CardDescription>在微信内打开这个入口，会走公众号 OAuth，再统一回到同一个回调接口。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>授权入口</Label>
              <Input value={getWechatAuthorizeUrl()} readOnly />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => copyText(getWechatAuthorizeUrl(), '授权入口')}>
                <Copy className="mr-2 h-4 w-4" />
                复制入口
              </Button>
              <Button
                type="button"
                onClick={() => window.open(getWechatAuthorizeUrl(), '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                打开授权入口
              </Button>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                统一回调地址为 `{config?.redirectUri || '/api/auth/wechat/callback'}`。如果这里不可用，优先检查微信平台配置和当前访问域名是否为 HTTPS 公网地址。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
