'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Save, RefreshCw, Loader2, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/platform-settings', {
        credentials: 'include', // 确保浏览器发送 Cookie
      });
      const result = await res.json();
      if (result.success) {
        setSettings(result.data);
      } else {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
        }
      }
    } catch (error) {
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 确保浏览器发送 Cookie
        body: JSON.stringify(settings)
      });
      const result = await res.json();
      if (result.success) {
        toast.success('设置已保存');
      } else {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
        } else {
          toast.error(result.error || '保存失败');
        }
      }
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认设置吗？')) {
      setSettings({
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
      });
      toast.info('设置已重置，请点击保存按钮保存');
    }
  };

  // 协议编辑器组件
  interface AgreementData {
    key: string;
    title: string;
    content: string;
    enabled: boolean;
  }

  function AgreementEditor() {
    const [agreements, setAgreements] = useState<AgreementData[]>([
      {
        key: 'asset_rental',
        title: '虚拟资产出租出售协议',
        content: `虚拟资产出租出售协议

1. 服务内容
本平台为用户提供虚拟游戏账号的出租、出售信息发布服务。用户在使用本服务前，请仔细阅读本协议的全部内容。

2. 用户权利与义务
2.1 卖家必须确保所提供的账号信息真实、准确、完整。
2.2 买家应按照约定使用账号，不得进行任何违规操作。
2.3 双方应通过本平台进行交易，禁止私下交易。

3. 责任与限制
3.1 平台不对账号的合规性、安全性做出保证。
3.2 因账号违规导致的封号等问题，由卖家承担相应责任。
3.3 平台仅提供信息发布服务，不承担交易纠纷的法律责任。

4. 服务费用
4.1 平台收取合理的佣金和服务费用，具体费率以平台公布为准。
4.2 卖家提现时需支付提现手续费。

5. 协议变更
5.1 平台有权根据业务需要修改本协议。
5.2 协议修改后，继续使用本服务即视为同意修改后的协议。

6. 争议解决
6.1 因本协议引起的争议，双方应友好协商解决。
6.2 协商不成的，提交平台所在地人民法院解决。`,
        enabled: true
      }
    ]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      loadAgreements();
    }, []);

    const loadAgreements = async () => {
      try {
        const res = await fetch('/api/admin/agreements');
        const result = await res.json();
        if (result.success && result.data) {
          setAgreements(result.data);
        }
      } catch (error) {
        console.error('加载协议失败:', error);
      }
    };

    const handleAgreementChange = (index: number, field: keyof AgreementData, value: any) => {
      const newAgreements = [...agreements];
      (newAgreements[index] as any)[field] = value;
      setAgreements(newAgreements);
    };

    const handleSaveAgreements = async () => {
      try {
        setSaving(true);
        const res = await fetch('/api/admin/agreements/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agreements })
        });
        const result = await res.json();
        if (result.success) {
          toast.success('协议已保存');
        } else {
          toast.error(result.error || '保存失败');
        }
      } catch (error) {
        toast.error('保存协议失败');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">协议内容</span>
          </div>
          <Button
            size="sm"
            onClick={handleSaveAgreements}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存协议'
            )}
          </Button>
        </div>

        {agreements.map((agreement, index) => (
          <div key={index} className="space-y-2 border rounded-lg p-4">
            <div className="grid gap-4">
              <div>
                <Label className="text-sm">协议标识</Label>
                <Input
                  type="text"
                  value={agreement.key}
                  onChange={(e) => handleAgreementChange(index, 'key', e.target.value)}
                  className="mt-1.5"
                  placeholder="例如：asset_rental"
                />
              </div>
              <div>
                <Label className="text-sm">协议标题</Label>
                <Input
                  type="text"
                  value={agreement.title}
                  onChange={(e) => handleAgreementChange(index, 'title', e.target.value)}
                  className="mt-1.5"
                  placeholder="例如：虚拟资产出租出售协议"
                />
              </div>
              <div>
                <Label className="text-sm">协议内容</Label>
                <Textarea
                  value={agreement.content}
                  onChange={(e) => handleAgreementChange(index, 'content', e.target.value)}
                  className="mt-1.5 min-h-[200px] font-mono text-sm"
                  placeholder="请输入协议内容"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`agreement-enabled-${index}`}
                  checked={agreement.enabled}
                  onChange={(e) => handleAgreementChange(index, 'enabled', e.target.checked)}
                />
                <Label htmlFor={`agreement-enabled-${index}`} className="text-sm cursor-pointer">
                  启用此协议
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台配置</h1>
          <p className="text-sm text-gray-600 mt-1">配置平台的佣金、手续费和其他参数</p>
        </div>

      {/* 平台佣金设置 */}
      <Card>
        <CardHeader>
          <CardTitle>平台佣金设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">佣金比例 (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.commissionRate}
                onChange={(e) => setSettings({...settings, commissionRate: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">从每笔交易中抽取的比例</p>
            </div>
            <div>
              <Label className="text-sm">最低佣金 (元)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.minCommission}
                onChange={(e) => setSettings({...settings, minCommission: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">最高佣金 (元)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.maxCommission}
                onChange={(e) => setSettings({...settings, maxCommission: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 手续费和定价设置 */}
      <Card>
        <CardHeader>
          <CardTitle>手续费和定价设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">提现手续费 (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.withdrawalFee}
                onChange={(e) => setSettings({...settings, withdrawalFee: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">提现金额的百分比手续费（例如：1表示1%）</p>
            </div>
            <div>
              <Label className="text-sm">最低租金 (元)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.minRentalPrice}
                onChange={(e) => setSettings({...settings, minRentalPrice: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">押金比例 (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.depositRatio}
                onChange={(e) => setSettings({...settings, depositRatio: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">押金占账号价值的百分比</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 租期和上限设置 */}
      <Card>
        <CardHeader>
          <CardTitle>租期和上限设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">每10M对应租期 (小时)</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={settings.coinsPerDay * 24}
                onChange={(e) => setSettings({...settings, coinsPerDay: (parseFloat(e.target.value) || 1) / 24})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">当前设置：{settings.coinsPerDay}M = 1天 ({settings.coinsPerDay * 24}小时)</p>
            </div>
            <div>
              <Label className="text-sm">最低租期 (小时)</Label>
              <Input
                type="number"
                min="1"
                value={settings.minRentalHours}
                onChange={(e) => setSettings({...settings, minRentalHours: parseFloat(e.target.value) || 1})}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">单账号最大哈夫币 (M)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={settings.maxCoinsPerAccount}
                onChange={(e) => setSettings({...settings, maxCoinsPerAccount: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">最大押金 (元)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.maxDeposit}
                onChange={(e) => setSettings({...settings, maxDeposit: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 审核设置 */}
      <Card>
        <CardHeader>
          <CardTitle>审核设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">是否需要人工审核</Label>
              <Select
                value={settings.requireManualReview ? 'true' : 'false'}
                onValueChange={(value) => setSettings({...settings, requireManualReview: value === 'true'})}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">开启后，新上架的账号需要人工审核</p>
            </div>
            <div>
              <Label className="text-sm">已认证用户自动审核</Label>
              <Select
                value={settings.autoApproveVerified ? 'true' : 'false'}
                onValueChange={(value) => setSettings({...settings, autoApproveVerified: value === 'true'})}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">已认证用户的账号自动通过审核</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上架和订单设置 */}
      <Card>
        <CardHeader>
          <CardTitle>上架和订单设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">上架保证金 (元)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.listingDepositAmount}
                onChange={(e) => setSettings({...settings, listingDepositAmount: parseFloat(e.target.value) || 0})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">卖家上架账号时需要冻结的保证金金额</p>
            </div>
            <div>
              <Label className="text-sm">订单支付超时 (秒)</Label>
              <Input
                type="number"
                min="60"
                step="1"
                value={settings.orderPaymentTimeout}
                onChange={(e) => setSettings({...settings, orderPaymentTimeout: parseFloat(e.target.value) || 1800})}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">买家支付订单的超时时间（默认1800秒=30分钟）</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 微信登录配置 */}
      <Card>
        <CardHeader>
          <CardTitle>微信登录配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 公众号配置 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">微信公众号配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wechatMpAppId">AppID</Label>
                <Input
                  id="wechatMpAppId"
                  value={settings.wechatMpAppId || ''}
                  onChange={(e) => setSettings({...settings, wechatMpAppId: e.target.value})}
                  placeholder="请输入公众号AppID"
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">微信公众平台的 AppID</p>
              </div>
              <div>
                <Label htmlFor="wechatMpAppSecret">AppSecret</Label>
                <Input
                  id="wechatMpAppSecret"
                  type="password"
                  value={settings.wechatMpAppSecret || ''}
                  onChange={(e) => setSettings({...settings, wechatMpAppSecret: e.target.value})}
                  placeholder="请输入公众号AppSecret"
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">微信公众平台的 AppSecret</p>
              </div>
            </div>
          </div>

          {/* 开放平台配置 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">微信开放平台配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wechatOpenAppId">AppID</Label>
                <Input
                  id="wechatOpenAppId"
                  value={settings.wechatOpenAppId || ''}
                  onChange={(e) => setSettings({...settings, wechatOpenAppId: e.target.value})}
                  placeholder="请输入开放平台AppID"
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">微信开放平台的 AppID（用于扫码登录）</p>
              </div>
              <div>
                <Label htmlFor="wechatOpenAppSecret">AppSecret</Label>
                <Input
                  id="wechatOpenAppSecret"
                  type="password"
                  value={settings.wechatOpenAppSecret || ''}
                  onChange={(e) => setSettings({...settings, wechatOpenAppSecret: e.target.value})}
                  placeholder="请输入开放平台AppSecret"
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">微信开放平台的 AppSecret</p>
              </div>
            </div>
          </div>

          {/* 域名验证文件管理 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-blue-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  微信域名验证文件
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  上传微信公众平台提供的域名验证文件，用于设置网页授权域名
                </p>
                <Button
                  variant="outline"
                  className="cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-100"
                  asChild
                >
                  <a href="/admin/wechat/verify-file">
                    管理验证文件
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 协议管理 */}
      <Card>
        <CardHeader>
          <CardTitle>协议管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgreementEditor />
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重置为默认
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}
