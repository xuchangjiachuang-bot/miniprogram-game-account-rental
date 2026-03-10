'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Settings,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ConfigStatus = {
  configured: boolean;
  missingFields: string[];
  certConfigured: boolean;
  certMissing: string[];
  appId?: string;
  mchId?: string;
  notifyUrl?: string;
};

export function WechatConfigClient() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/wechat/config');
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '加载微信支付配置失败');
        return;
      }

      setStatus(result.data);
    } catch (err) {
      console.error('加载微信支付配置失败:', err);
      setError('加载微信支付配置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isReady = Boolean(status?.configured && status?.certConfigured);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" aria-label="返回管理后台">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  微信支付配置
                </CardTitle>
                <CardDescription>检查当前微信支付参数和证书是否完整。</CardDescription>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={loadStatus} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Link href="/admin/payment/wechat/check">
                <Button variant="outline">深度检查</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              正在检查配置...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>检查失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : status ? (
            <div className="space-y-6">
              <Alert className={isReady ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                {isReady ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                <AlertTitle>{isReady ? '配置完整' : '配置未完成'}</AlertTitle>
                <AlertDescription>
                  {isReady ? '基础参数和证书都已配置完成。' : '还有缺失项，支付能力可能无法正常使用。'}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AppID</CardTitle>
                  </CardHeader>
                  <CardContent className="break-all text-sm text-muted-foreground">
                    {status.appId || '未配置'}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">商户号</CardTitle>
                  </CardHeader>
                  <CardContent className="break-all text-sm text-muted-foreground">
                    {status.mchId || '未配置'}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">回调地址</CardTitle>
                  </CardHeader>
                  <CardContent className="break-all text-sm text-muted-foreground">
                    {status.notifyUrl || '未配置'}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">基础参数缺失</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {status.missingFields.length ? status.missingFields.join('、') : '无'}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">证书缺失</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {status.certMissing.length ? status.certMissing.join('、') : '无'}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>下一步建议</CardTitle>
          <CardDescription>如果你还没完成配置，可以按下面顺序处理。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. 在微信支付商户平台准备 AppID、商户号和 API 密钥。</p>
          <p>2. 上传或配置商户证书，确保退款等高级能力可用。</p>
          <p>3. 配置完成后再次点击“刷新”或进入“深度检查”页面确认结果。</p>
          <div className="flex gap-2 pt-2">
            <Link href="/admin/payment/wechat/check">
              <Button>打开深度检查</Button>
            </Link>
            <a href="https://pay.weixin.qq.com" target="_blank" rel="noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                商户平台
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
