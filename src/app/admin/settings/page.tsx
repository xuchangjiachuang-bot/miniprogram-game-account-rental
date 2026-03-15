'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Shield,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface PlatformSettings {
  commissionRate: number;
  minCommission: number;
  maxCommission: number;
  withdrawalFee: number;
  minRentalPrice: number;
  depositRatio: number;
  coinsPerDay: number;
  minRentalHours: number;
  maxCoinsPerAccount: number;
  maxDeposit: number;
  requireManualReview: boolean;
  autoApproveVerified: boolean;
  listingDepositAmount: number;
  orderPaymentTimeout: number;
  wechatMpAppId: string;
  wechatMpAppSecret: string;
  wechatOpenAppId: string;
  wechatOpenAppSecret: string;
  wechatToken: string;
  wechatEncodingAESKey: string;
}

interface AgreementData {
  key: string;
  title: string;
  content: string;
  enabled: boolean;
}

interface PaymentStatus {
  configured: boolean;
  missingFields: string[];
  certConfigured: boolean;
  certMissing: string[];
  callbackVerificationConfigured?: boolean;
  callbackVerificationMissing?: string[];
  callbackVerificationMode?: 'public_key' | 'platform_certificate' | 'unknown';
  appId?: string;
  mchId?: string;
  notifyUrl?: string;
  apiVersion?: 'v2' | 'v3';
  transferConfigured?: boolean;
  publicKeyId?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  commissionRate: 5,
  minCommission: 0,
  maxCommission: 100,
  withdrawalFee: 1,
  minRentalPrice: 50,
  depositRatio: 50,
  coinsPerDay: 10,
  minRentalHours: 24,
  maxCoinsPerAccount: 1000,
  maxDeposit: 10000,
  requireManualReview: true,
  autoApproveVerified: false,
  listingDepositAmount: 50,
  orderPaymentTimeout: 1800,
  wechatMpAppId: '',
  wechatMpAppSecret: '',
  wechatOpenAppId: '',
  wechatOpenAppSecret: '',
  wechatToken: '',
  wechatEncodingAESKey: '',
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasMissing(fields: string[] | undefined, keyword: string) {
  return (fields || []).some((field) => field.includes(keyword));
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [redirectUri, setRedirectUri] = useState('');
  const [serverVerifyUrl, setServerVerifyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAgreements, setSavingAgreements] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerVerifyUrl(`${window.location.origin}/api/wechat/server-verify`);
    }
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSettings(), loadWechatConfig(), loadPaymentStatus(), loadAgreements()]);
    } catch (error: any) {
      toast.error(error.message || '加载配置中心失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const response = await fetch('/api/admin/platform-settings', {
      credentials: 'include',
      cache: 'no-store',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || '加载平台配置失败');

    setSettings((prev) => ({
      ...prev,
      ...result.data,
      wechatMpAppSecret: prev.wechatMpAppSecret,
      wechatOpenAppSecret: prev.wechatOpenAppSecret,
      wechatToken: prev.wechatToken,
      wechatEncodingAESKey: prev.wechatEncodingAESKey,
    }));
  };

  const loadWechatConfig = async () => {
    const response = await fetch('/api/admin/wechat/config', {
      credentials: 'include',
      cache: 'no-store',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || '加载微信配置失败');

    setRedirectUri(result.data.redirectUri || '');
    setSettings((prev) => ({
      ...prev,
      wechatMpAppId: result.data.wechatMpAppId || prev.wechatMpAppId,
      wechatMpAppSecret: result.data.wechatMpAppSecret || '',
      wechatOpenAppId: result.data.wechatOpenAppId || prev.wechatOpenAppId,
      wechatOpenAppSecret: result.data.wechatOpenAppSecret || '',
      wechatToken: result.data.wechatToken || '',
      wechatEncodingAESKey: result.data.wechatEncodingAESKey || '',
    }));
  };

  const loadPaymentStatus = async () => {
    setRefreshingPayment(true);
    try {
      const response = await fetch('/api/payment/wechat/config', { cache: 'no-store' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '加载微信支付状态失败');
      setPaymentStatus(result.data);
    } finally {
      setRefreshingPayment(false);
    }
  };

  const loadAgreements = async () => {
    const response = await fetch('/api/admin/agreements', {
      credentials: 'include',
      cache: 'no-store',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || '加载协议失败');
    setAgreements(result.data || []);
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '保存配置失败');
      toast.success('配置已保存');
      await Promise.all([loadSettings(), loadWechatConfig()]);
    } catch (error: any) {
      toast.error(error.message || '保存配置失败');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveAgreements = async () => {
    try {
      setSavingAgreements(true);
      const response = await fetch('/api/admin/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agreements }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '保存协议失败');
      toast.success('协议已保存');
      await loadAgreements();
    } catch (error: any) {
      toast.error(error.message || '保存协议失败');
    } finally {
      setSavingAgreements(false);
    }
  };

  const testPayment = async () => {
    try {
      setTestingPayment(true);
      const response = await fetch('/api/payment/wechat/config', { method: 'POST' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '微信支付配置校验失败');
      toast.success(result.message || '微信支付配置有效');
    } catch (error: any) {
      toast.error(error.message || '微信支付配置校验失败');
    } finally {
      setTestingPayment(false);
      await loadPaymentStatus();
    }
  };

  const copyText = async (value: string, label: string) => {
    if (!value) {
      toast.error(`${label} 为空，无法复制`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} 已复制`);
    } catch {
      toast.error(`复制${label}失败`);
    }
  };

  const paymentItems = useMemo(
    () => [
      {
        key: 'WECHAT_PAY_APPID',
        label: '支付 AppID',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'APPID') : false,
        value: paymentStatus?.appId || '',
      },
      {
        key: 'WECHAT_PAY_MCHID',
        label: '商户号',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'MCHID') : false,
        value: paymentStatus?.mchId || '',
      },
      {
        key: 'WECHAT_PAY_NOTIFY_URL',
        label: '支付回调地址',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'NOTIFY_URL') : false,
        value: paymentStatus?.notifyUrl || '',
      },
      {
        key: 'WECHAT_PAY_API_V3_KEY',
        label: 'APIv3 密钥',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'API_V3_KEY') : false,
        value: '',
      },
      {
        key: 'WECHAT_PAY_SERIAL_NO',
        label: '证书序列号',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'SERIAL_NO') : false,
        value: '',
      },
      {
        key: 'WECHAT_PAY_PRIVATE_KEY',
        label: '商户私钥',
        ready: paymentStatus ? !hasMissing(paymentStatus.missingFields, 'PRIVATE_KEY') : false,
        value: '',
      },
      {
        key: 'WECHAT_PAY_PUBLIC_KEY',
        label: '微信支付公钥',
        ready: paymentStatus?.callbackVerificationMode === 'public_key'
          ? Boolean(paymentStatus.callbackVerificationConfigured)
          : true,
        value: '',
      },
      {
        key: 'WECHAT_PAY_PUBLIC_KEY_ID',
        label: '微信支付公钥 ID',
        ready: paymentStatus?.callbackVerificationMode === 'public_key'
          ? Boolean(paymentStatus.callbackVerificationConfigured)
          : true,
        value: paymentStatus?.publicKeyId || '',
      },
      {
        key: 'WECHAT_PAY_TRANSFER_SCENE_ID',
        label: '商家转账场景 ID',
        ready: Boolean(paymentStatus?.transferConfigured),
        value: '',
      },
    ],
    [paymentStatus]
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">配置中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            业务参数和微信登录配置保存在数据库，可随时修改；微信支付密钥只读 Railway 环境变量，避免互相覆盖。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新全部
          </Button>
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存配置
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>业务规则</CardDescription><CardTitle className="text-base">佣金与订单</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground"><div>佣金比例：{settings.commissionRate}%</div><div>上架保证金：¥{settings.listingDepositAmount}</div><div>支付超时：{settings.orderPaymentTimeout} 秒</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>微信登录</CardDescription><CardTitle className="text-base">公众号与开放平台</CardTitle></CardHeader><CardContent className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{settings.wechatMpAppId || settings.wechatOpenAppId ? '已配置' : '待配置'}</span><Badge variant={settings.wechatMpAppId || settings.wechatOpenAppId ? 'default' : 'outline'}>{settings.wechatMpAppId || settings.wechatOpenAppId ? '正常' : '未完成'}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>微信服务器</CardDescription><CardTitle className="text-base">Token 与 AES Key</CardTitle></CardHeader><CardContent className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{settings.wechatToken && settings.wechatEncodingAESKey ? '已配置' : '待配置'}</span><Badge variant={settings.wechatToken && settings.wechatEncodingAESKey ? 'default' : 'outline'}>{settings.wechatToken && settings.wechatEncodingAESKey ? '正常' : '未完成'}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>微信支付运行时</CardDescription><CardTitle className="text-base">Railway 环境变量</CardTitle></CardHeader><CardContent className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{paymentStatus?.configured ? '基础项已就绪' : '存在缺项'}</span><Badge variant={paymentStatus?.configured ? 'default' : 'outline'}>{paymentStatus?.configured ? '运行中' : '待补齐'}</Badge></CardContent></Card>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business">业务与登录</TabsTrigger>
          <TabsTrigger value="payment">微信支付</TabsTrigger>
          <TabsTrigger value="agreements">协议内容</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />业务规则</CardTitle>
              <CardDescription>保留最常改的业务参数，其余字段会随同一起保存。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2"><Label>佣金比例 (%)</Label><Input type="number" value={settings.commissionRate} onChange={(e) => setSettings((prev) => ({ ...prev, commissionRate: toNumber(e.target.value, prev.commissionRate) }))} /></div>
              <div className="space-y-2"><Label>提现手续费 (%)</Label><Input type="number" value={settings.withdrawalFee} onChange={(e) => setSettings((prev) => ({ ...prev, withdrawalFee: toNumber(e.target.value, prev.withdrawalFee) }))} /></div>
              <div className="space-y-2"><Label>最低租金 (元)</Label><Input type="number" value={settings.minRentalPrice} onChange={(e) => setSettings((prev) => ({ ...prev, minRentalPrice: toNumber(e.target.value, prev.minRentalPrice) }))} /></div>
              <div className="space-y-2"><Label>押金比例 (%)</Label><Input type="number" value={settings.depositRatio} onChange={(e) => setSettings((prev) => ({ ...prev, depositRatio: toNumber(e.target.value, prev.depositRatio) }))} /></div>
              <div className="space-y-2"><Label>上架保证金 (元)</Label><Input type="number" value={settings.listingDepositAmount} onChange={(e) => setSettings((prev) => ({ ...prev, listingDepositAmount: toNumber(e.target.value, prev.listingDepositAmount) }))} /></div>
              <div className="space-y-2"><Label>订单支付超时 (秒)</Label><Input type="number" value={settings.orderPaymentTimeout} onChange={(e) => setSettings((prev) => ({ ...prev, orderPaymentTimeout: toNumber(e.target.value, prev.orderPaymentTimeout) }))} /></div>
              <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-4"><div><div className="font-medium">新上架人工审核</div><div className="text-sm text-muted-foreground">关闭后会减少人工审核量。</div></div><Switch checked={settings.requireManualReview} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, requireManualReview: checked }))} /></div></div>
              <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-4"><div><div className="font-medium">实名用户自动审核</div><div className="text-sm text-muted-foreground">适合流程稳定后开启。</div></div><Switch checked={settings.autoApproveVerified} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoApproveVerified: checked }))} /></div></div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />微信登录配置</CardTitle>
                <CardDescription>这里维护数据库中的登录参数。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>公众号 AppID</Label><Input value={settings.wechatMpAppId} onChange={(e) => setSettings((prev) => ({ ...prev, wechatMpAppId: e.target.value }))} placeholder="wx..." /></div>
                <div className="space-y-2"><Label>公众号 AppSecret</Label><Input type="password" value={settings.wechatMpAppSecret} onChange={(e) => setSettings((prev) => ({ ...prev, wechatMpAppSecret: e.target.value }))} placeholder="请输入公众号 AppSecret" /></div>
                <div className="space-y-2"><Label>开放平台 AppID</Label><Input value={settings.wechatOpenAppId} onChange={(e) => setSettings((prev) => ({ ...prev, wechatOpenAppId: e.target.value }))} placeholder="wx..." /></div>
                <div className="space-y-2"><Label>开放平台 AppSecret</Label><Input type="password" value={settings.wechatOpenAppSecret} onChange={(e) => setSettings((prev) => ({ ...prev, wechatOpenAppSecret: e.target.value }))} placeholder="请输入开放平台 AppSecret" /></div>
                <div className="md:col-span-2 rounded-xl border bg-muted/30 p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">微信回调地址</div><div className="mt-1 break-all text-sm text-muted-foreground">{redirectUri || '尚未生成'}</div></div><Button variant="outline" size="icon" onClick={() => copyText(redirectUri, '微信回调地址')}><Copy className="h-4 w-4" /></Button></div></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />微信服务器配置</CardTitle>
                <CardDescription>用于服务器验证与消息推送。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>服务器地址</Label><div className="flex gap-2"><Input value={serverVerifyUrl} readOnly /><Button variant="outline" size="icon" onClick={() => copyText(serverVerifyUrl, '服务器地址')}><Copy className="h-4 w-4" /></Button></div></div>
                <div className="space-y-2"><Label>Token</Label><Input value={settings.wechatToken} onChange={(e) => setSettings((prev) => ({ ...prev, wechatToken: e.target.value }))} placeholder="3-32 位自定义字符串" /></div>
                <div className="space-y-2"><Label>EncodingAESKey</Label><div className="flex gap-2"><Input value={settings.wechatEncodingAESKey} onChange={(e) => setSettings((prev) => ({ ...prev, wechatEncodingAESKey: e.target.value }))} placeholder="43 位随机字符串" /><Button variant="outline" onClick={() => { const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let text = ''; for (let i = 0; i < 43; i += 1) text += chars[Math.floor(Math.random() * chars.length)]; setSettings((prev) => ({ ...prev, wechatEncodingAESKey: text })); }}>生成</Button></div></div>
                <div className="flex flex-wrap gap-2"><Link href="/admin/wechat/verify-file"><Button variant="outline"><FileText className="mr-2 h-4 w-4" />域名校验文件</Button></Link><Link href="/admin/wechat-debug"><Button variant="outline"><Shield className="mr-2 h-4 w-4" />微信登录调试</Button></Link></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>微信支付运行时只认 Railway 环境变量</AlertTitle>
            <AlertDescription>
              支付商户号、APIv3 密钥、私钥、证书序列号和转账场景只从 Railway 读取。后台这里只展示运行状态和缺失项，不会覆盖线上支付配置。
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />微信支付状态</CardTitle>
                  <CardDescription>这里展示线上服务当前真正读到的支付配置。</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadPaymentStatus} disabled={refreshingPayment}>{refreshingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}刷新</Button>
                  <Button onClick={testPayment} disabled={testingPayment}>{testingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}校验配置</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">基础配置</div><div className="mt-2 flex items-center gap-2">{paymentStatus?.configured ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}<span className="font-medium">{paymentStatus?.configured ? '已完整' : '存在缺项'}</span></div></div>
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">证书配置</div><div className="mt-2 flex items-center gap-2">{paymentStatus?.certConfigured ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}<span className="font-medium">{paymentStatus?.certConfigured ? '已完整' : '待补齐'}</span></div></div>
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">转账场景</div><div className="mt-2 flex items-center gap-2">{paymentStatus?.transferConfigured ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}<span className="font-medium">{paymentStatus?.transferConfigured ? '已配置' : '未配置'}</span></div></div>
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">回调验签</div><div className="mt-2 flex items-center gap-2">{paymentStatus?.callbackVerificationConfigured !== false ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}<span className="font-medium">{paymentStatus?.callbackVerificationMode === 'public_key' ? '公钥模式' : paymentStatus?.callbackVerificationMode === 'platform_certificate' ? '平台证书模式' : '未知'}</span></div></div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">支付 AppID</div><div className="mt-2 break-all font-mono text-sm">{paymentStatus?.appId || '未读取到'}</div></div>
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">商户号</div><div className="mt-2 break-all font-mono text-sm">{paymentStatus?.mchId || '未读取到'}</div></div>
                  <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">支付回调地址</div><div className="mt-2 break-all font-mono text-sm">{paymentStatus?.notifyUrl || '未读取到'}</div></div>
                </div>
                {!!paymentStatus?.missingFields?.length && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>当前运行时缺少以下字段</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-4">{paymentStatus.missingFields.map((field) => <li key={field}>{field}</li>)}</ul></AlertDescription></Alert>}
                {!!paymentStatus?.callbackVerificationMissing?.length && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>回调验签配置不完整</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-4">{paymentStatus.callbackVerificationMissing.map((field) => <li key={field}>{field}</li>)}</ul></AlertDescription></Alert>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>环境变量清单</CardTitle>
                <CardDescription>需要在 Railway Variables 里维护，这里统一展示名称和状态。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentItems.map((item) => (
                  <div key={item.key} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><div className="font-medium">{item.label}</div><div className="mt-1 font-mono text-xs text-muted-foreground">{item.key}</div></div>
                      <Badge variant={item.ready ? 'default' : 'outline'}>{item.ready ? '已配置' : '待配置'}</Badge>
                    </div>
                    {item.value ? <div className="mt-2 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{item.value}</div> : null}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href="/admin/payment/wechat"><Button variant="outline">支付概览</Button></Link>
                  <Link href="/admin/payments"><Button variant="outline">支付管理</Button></Link>
                  <Link href="/admin/payment/wechat/check"><Button variant="outline">深度检查</Button></Link>
                  <a href="https://railway.com" target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" />打开 Railway</Button></a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agreements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />协议内容</CardTitle>
              <CardDescription>协议文案也统一放进配置中心，避免分散在旧页面里。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agreements.map((agreement, index) => (
                <div key={agreement.key || index} className="space-y-4 rounded-xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>协议标识</Label><Input value={agreement.key} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], key: e.target.value }; setAgreements(next); }} /></div>
                    <div className="space-y-2"><Label>协议标题</Label><Input value={agreement.title} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], title: e.target.value }; setAgreements(next); }} /></div>
                  </div>
                  <div className="space-y-2"><Label>协议内容</Label><Textarea value={agreement.content} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], content: e.target.value }; setAgreements(next); }} className="min-h-[220px]" /></div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"><div><div className="font-medium">是否启用</div><div className="text-sm text-muted-foreground">关闭后前台将不再展示这条协议。</div></div><Switch checked={agreement.enabled} onCheckedChange={(checked) => { const next = [...agreements]; next[index] = { ...next[index], enabled: checked }; setAgreements(next); }} /></div>
                </div>
              ))}
              <div className="flex justify-end"><Button onClick={saveAgreements} disabled={savingAgreements}>{savingAgreements ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}保存协议</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
