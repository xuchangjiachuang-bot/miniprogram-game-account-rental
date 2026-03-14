'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Info, Copy, ExternalLink } from 'lucide-react';

interface ConfigData {
  configured: boolean;
  missingFields: string[];
  certConfigured: boolean;
  certMissing: string[];
  appId?: string;
  mpAppId?: string;
  appIdMatch?: boolean;
  mchId?: string;
  notifyUrl?: string;
}

export default function WechatPaymentConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payment/wechat/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      } else {
        setError(data.error || '获取配置失败');
      }
    } catch (err) {
      setError('网络错误，请检查服务器是否启动');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">正在检查配置...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>配置检查失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!config) return null;

  const isFullyConfigured = config.configured && config.certConfigured;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">微信支付配置检查</h1>
        <p className="text-muted-foreground">检查您的微信支付配置是否正确</p>
      </div>

      {/* 总体状态 */}
      <Alert className={`mb-6 ${isFullyConfigured ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'}`}>
        {isFullyConfigured ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        )}
        <AlertTitle className={isFullyConfigured ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
          {isFullyConfigured ? '配置完整' : '配置不完整'}
        </AlertTitle>
        <AlertDescription>
          {isFullyConfigured
            ? '您的微信支付配置已全部完成，可以正常使用支付功能。'
            : '您的微信支付配置不完整，请检查以下配置项。'}
        </AlertDescription>
      </Alert>

      {/* 基础配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            基础配置
          </CardTitle>
          <CardDescription>微信支付基础配置项</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {config.appId ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <div className="font-medium">AppID</div>
                  <div className="text-sm text-muted-foreground">微信应用 ID</div>
                </div>
              </div>
              {config.appId && (
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm">{config.appId}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(config.appId!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {config.mpAppId ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <div className="font-medium">公众号 AppID</div>
                  <div className="text-sm text-muted-foreground">JSAPI 支付和微信内授权使用的 AppID</div>
                </div>
              </div>
              {config.mpAppId && (
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm">{config.mpAppId}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(config.mpAppId!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Alert variant={config.appIdMatch ? 'default' : 'destructive'}>
              {config.appIdMatch ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{config.appIdMatch ? 'AppID 一致' : 'AppID 可能不一致'}</AlertTitle>
              <AlertDescription>
                {config.appIdMatch
                  ? '支付 AppID 与公众号 AppID 已对齐，微信内支付权限匹配概率更高。'
                  : '如果微信内出现 chooseWXPay:permission denied，优先检查商户号绑定的支付 AppID 是否和公众号 AppID 一致。'}
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {config.mchId ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <div className="font-medium">商户号 (Mch ID)</div>
                  <div className="text-sm text-muted-foreground">微信支付商户号</div>
                </div>
              </div>
              {config.mchId && (
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm">{config.mchId}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(config.mchId!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {config.notifyUrl ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <div className="font-medium">回调地址</div>
                  <div className="text-sm text-muted-foreground">支付结果通知地址</div>
                </div>
              </div>
              {config.notifyUrl && (
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm max-w-[300px] truncate">{config.notifyUrl}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(config.notifyUrl!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {config.missingFields.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>缺少配置项</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {config.missingFields.map((field, index) => (
                      <li key={index}>{field}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 证书配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            证书配置
          </CardTitle>
          <CardDescription>退款功能需要配置证书</CardDescription>
        </CardHeader>
        <CardContent>
          {config.certConfigured ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-600 dark:text-green-400">证书配置完整</AlertTitle>
              <AlertDescription>
                所有证书文件已正确配置，可以使用退款功能。
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>证书配置不完整</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p className="mb-2">缺少以下证书文件：</p>
                  <ul className="list-disc list-inside">
                    {config.certMissing.map((file, index) => (
                      <li key={index}>{file}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm">
                    请从微信支付商户平台下载证书文件，并放置到 <code>certs/wechat/</code> 目录下。
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button onClick={checkConfig} disabled={loading}>
          重新检查配置
        </Button>
        <Button variant="outline" asChild>
          <a href="/WECHAT_PAYMENT_CONFIG.md" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            查看配置指南
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://pay.weixin.qq.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            进入微信支付商户平台
          </a>
        </Button>
      </div>

      {/* 重要提示 */}
      <Card className="mt-6 border-yellow-500">
        <CardHeader>
          <CardTitle className="text-yellow-600 dark:text-yellow-400">重要提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. 配置 API 密钥后，必须重启开发服务器才能生效。</p>
            <p>2. API 密钥只能重置，无法查看，请妥善保管。</p>
            <p>3. 支付授权目录必须以 <code>/</code> 结尾。</p>
            <p>4. 配置后可能需要等待 5-10 分钟才能生效。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
