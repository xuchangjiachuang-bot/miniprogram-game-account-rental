'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
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
  requireWithdrawalManualReview: boolean;
  requireVerificationManualReview: boolean;
  autoApproveVerified: boolean;
  listingDepositAmount: number;
  orderPaymentTimeout: number;
  orderConsumptionCatalog: Array<{
    id: string;
    name: string;
    price: number;
    unitLabel: string;
    enabled: boolean;
  }>;
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
  requireWithdrawalManualReview: true,
  requireVerificationManualReview: true,
  autoApproveVerified: false,
  listingDepositAmount: 50,
  orderPaymentTimeout: 180,
  orderConsumptionCatalog: [
    { id: 'default-bullet', name: '子弹', price: 1, unitLabel: '个', enabled: true },
    { id: 'default-armor', name: '护甲', price: 10, unitLabel: '件', enabled: true },
    { id: 'default-medicine', name: '药品', price: 5, unitLabel: '个', enabled: true },
  ],
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createConsumptionCatalogItem() {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    unitLabel: '个',
    enabled: true,
  };
}

function hasMissing(fields: string[] | undefined, keyword: string) {
  return (fields || []).some((field) => field.includes(keyword));
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAgreements, setSavingAgreements] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSettings(), loadPaymentStatus(), loadAgreements()]);
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

  const getSettingsPayload = () => ({
    commissionRate: settings.commissionRate,
    minCommission: settings.minCommission,
    maxCommission: settings.maxCommission,
    withdrawalFee: settings.withdrawalFee,
    minRentalPrice: settings.minRentalPrice,
    depositRatio: settings.depositRatio,
    coinsPerDay: settings.coinsPerDay,
    minRentalHours: settings.minRentalHours,
    maxCoinsPerAccount: settings.maxCoinsPerAccount,
    maxDeposit: settings.maxDeposit,
    requireManualReview: settings.requireManualReview,
    requireWithdrawalManualReview: settings.requireWithdrawalManualReview,
    requireVerificationManualReview: settings.requireVerificationManualReview,
    autoApproveVerified: settings.autoApproveVerified,
    listingDepositAmount: settings.listingDepositAmount,
    orderPaymentTimeout: settings.orderPaymentTimeout,
    orderConsumptionCatalog: settings.orderConsumptionCatalog,
  });

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(getSettingsPayload()),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '保存配置失败');
      toast.success('配置已保存');
      await loadSettings();
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

  const updateConsumptionCatalogItem = (
    index: number,
    field: 'name' | 'price' | 'unitLabel' | 'enabled',
    value: string | number | boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      orderConsumptionCatalog: prev.orderConsumptionCatalog.map((item, itemIndex) => (
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'price'
                ? Math.max(0, Number(Number(value).toFixed(2)))
                : value,
            }
          : item
      )),
    }));
  };

  const addConsumptionCatalogItem = () => {
    setSettings((prev) => ({
      ...prev,
      orderConsumptionCatalog: [...prev.orderConsumptionCatalog, createConsumptionCatalogItem()],
    }));
  };

  const removeConsumptionCatalogItem = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      orderConsumptionCatalog:
        prev.orderConsumptionCatalog.length <= 1
          ? [createConsumptionCatalogItem()]
          : prev.orderConsumptionCatalog.filter((_, itemIndex) => itemIndex !== index),
    }));
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
    [paymentStatus],
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
            这里只保留当前真实生效的业务参数；微信支付密钥只读 Railway 环境变量，避免后台配置和线上运行时互相覆盖。
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>业务规则</CardDescription>
            <CardTitle className="text-base">佣金与订单</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div>基础佣金：{settings.commissionRate}%</div>
            <div>订单押金：由卖家上架时手动填写</div>
            <div>上架保证金：¥{settings.listingDepositAmount}</div>
            <div>支付超时：{settings.orderPaymentTimeout} 秒</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>微信支付运行时</CardDescription>
            <CardTitle className="text-base">Railway 环境变量</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{paymentStatus?.configured ? '基础项已就绪' : '存在缺项'}</span>
            <Badge variant={paymentStatus?.configured ? 'default' : 'outline'}>
              {paymentStatus?.configured ? '运行中' : '待补齐'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business">业务设置</TabsTrigger>
          <TabsTrigger value="payment">微信支付</TabsTrigger>
          <TabsTrigger value="agreements">协议内容</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                业务规则
              </CardTitle>
              <CardDescription>这里只保留当前真实生效的业务参数。微信登录和微信服务器配置已从这里移除。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>佣金比例 (%)</Label>
                <Input
                  type="number"
                  value={settings.commissionRate}
                  onChange={(e) => setSettings((prev) => ({ ...prev, commissionRate: toNumber(e.target.value, prev.commissionRate) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>提现手续费 (%)</Label>
                <Input
                  type="number"
                  value={settings.withdrawalFee}
                  onChange={(e) => setSettings((prev) => ({ ...prev, withdrawalFee: toNumber(e.target.value, prev.withdrawalFee) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>最低租金 (元)</Label>
                <Input
                  type="number"
                  value={settings.minRentalPrice}
                  onChange={(e) => setSettings((prev) => ({ ...prev, minRentalPrice: toNumber(e.target.value, prev.minRentalPrice) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>上架保证金 (元)</Label>
                <Input
                  type="number"
                  value={settings.listingDepositAmount}
                  onChange={(e) => setSettings((prev) => ({ ...prev, listingDepositAmount: toNumber(e.target.value, prev.listingDepositAmount) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>订单支付超时 (秒)</Label>
                <Input
                  type="number"
                  value={settings.orderPaymentTimeout}
                  onChange={(e) => setSettings((prev) => ({ ...prev, orderPaymentTimeout: toNumber(e.target.value, prev.orderPaymentTimeout) }))}
                />
              </div>
              {false && <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">账号上架人工审核</div>
                    <div className="text-sm text-muted-foreground">关闭后，新发布账号会直接通过上架审核。</div>
                  </div>
                  <Switch checked={settings.requireManualReview} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, requireManualReview: checked }))} />
                </div>
              </div>}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">提现人工审核</div>
                    <div className="text-sm text-muted-foreground">建议保持开启。关闭后，提现申请会直接进入已通过状态。</div>
                  </div>
                  <Switch checked={settings.requireWithdrawalManualReview} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, requireWithdrawalManualReview: checked }))} />
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">实名认证人工审核</div>
                    <div className="text-sm text-muted-foreground">关闭后，用户提交实名认证会自动通过，并立即更新实名状态。</div>
                  </div>
                  <Switch checked={settings.requireVerificationManualReview} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, requireVerificationManualReview: checked }))} />
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">已实名卖家上架自动审核</div>
                    <div className="text-sm text-muted-foreground">仅影响账号上架审核，不影响提现审核或实名申请审核。</div>
                  </div>
                  <Switch checked={settings.autoApproveVerified} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoApproveVerified: checked }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>资源消耗模板</CardTitle>
              <CardDescription>这里配置卖家发起“资源消耗结算”时可直接套用的名称、单价和单位。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.orderConsumptionCatalog.map((item, index) => (
                <div key={item.id || index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto_auto]">
                  <div className="space-y-2">
                    <Label>名称</Label>
                    <Input
                      value={item.name}
                      onChange={(event) => updateConsumptionCatalogItem(index, 'name', event.target.value)}
                      placeholder="例如：子弹、药品、护甲"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单价</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(event) => updateConsumptionCatalogItem(index, 'price', toNumber(event.target.value, item.price))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单位</Label>
                    <Input
                      value={item.unitLabel}
                      onChange={(event) => updateConsumptionCatalogItem(index, 'unitLabel', event.target.value)}
                      placeholder="个"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      <Switch checked={item.enabled} onCheckedChange={(checked) => updateConsumptionCatalogItem(index, 'enabled', checked)} />
                      <span className="text-sm text-muted-foreground">启用</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={() => removeConsumptionCatalogItem(index)}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-xl border border-dashed p-4">
                <div className="text-sm text-muted-foreground">保存后，订单详情里的资源消耗结算表单会直接读取这里的模板。</div>
                <Button type="button" variant="outline" onClick={addConsumptionCatalogItem}>
                  新增模板
                </Button>
              </div>
            </CardContent>
          </Card>
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
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    微信支付状态
                  </CardTitle>
                  <CardDescription>这里展示线上服务当前真正读到的支付配置。</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadPaymentStatus} disabled={refreshingPayment}>
                    {refreshingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    刷新
                  </Button>
                  <Button onClick={testPayment} disabled={testingPayment}>
                    {testingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    校验配置
                  </Button>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agreements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                协议内容
              </CardTitle>
              <CardDescription>协议文案也统一放进配置中心，避免分散在旧页面里。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agreements.map((agreement, index) => (
                <div key={agreement.key || index} className="space-y-4 rounded-xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>协议标识</Label>
                      <Input value={agreement.key} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], key: e.target.value }; setAgreements(next); }} />
                    </div>
                    <div className="space-y-2">
                      <Label>协议标题</Label>
                      <Input value={agreement.title} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], title: e.target.value }; setAgreements(next); }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>协议内容</Label>
                    <Textarea value={agreement.content} onChange={(e) => { const next = [...agreements]; next[index] = { ...next[index], content: e.target.value }; setAgreements(next); }} className="min-h-[220px]" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                    <div>
                      <div className="font-medium">是否启用</div>
                      <div className="text-sm text-muted-foreground">关闭后前台将不再展示这条协议。</div>
                    </div>
                    <Switch checked={agreement.enabled} onCheckedChange={(checked) => { const next = [...agreements]; next[index] = { ...next[index], enabled: checked }; setAgreements(next); }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={saveAgreements} disabled={savingAgreements}>
                  {savingAgreements ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  保存协议
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
