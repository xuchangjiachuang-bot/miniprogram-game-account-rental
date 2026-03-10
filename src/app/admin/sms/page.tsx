'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, CheckCircle, XCircle, Send, Key, Globe, Loader2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SmsRecord {
  id: string;
  provider: string;
  phone: string;
  code: string;
  templateCode: string;
  status: 'success' | 'failed';
  message: string;
  requestId?: string;
  bizId?: string;
  createdAt: string;
}

interface SmsApiConfig {
  id: string;
  name: string;
  provider: 'aliyun' | 'tencent' | 'yunpian' | 'custom';
  apiKey: string;
  apiSecret: string;
  signName: string;
  endpoint: string;
  enabled: boolean;
  defaultTemplate: string;
  maxDailyCount: number;
  currentCount: number;
}

// 默认配置常量
const DEFAULT_CONFIGS: Record<string, SmsApiConfig> = {
  'aliyun': {
    id: 'SMS_ALIYUN',
    name: '阿里云短信',
    provider: 'aliyun',
    apiKey: '',
    apiSecret: '',
    signName: '三角洲行动',
    endpoint: 'dysmsapi.aliyuncs.com',
    enabled: true,
    defaultTemplate: 'SMS_001',
    maxDailyCount: 10000,
    currentCount: 0
  },
  'tencent': {
    id: 'SMS_TENCENT',
    name: '腾讯云短信',
    provider: 'tencent',
    apiKey: '',
    apiSecret: '',
    signName: '三角洲行动',
    endpoint: 'sms.tencentcloudapi.com',
    enabled: false,
    defaultTemplate: '100001',
    maxDailyCount: 5000,
    currentCount: 0
  },
  'yunpian': {
    id: 'SMS_YUNPIAN',
    name: '云片短信',
    provider: 'yunpian',
    apiKey: '',
    apiSecret: '',
    signName: '【三角洲行动】',
    endpoint: 'https://sms.yunpian.com/v2/sms/single_send.json',
    enabled: false,
    defaultTemplate: '',
    maxDailyCount: 1000,
    currentCount: 0
  }
};

export default function AdminSms() {
  const [activeTab, setActiveTab] = useState<'aliyun' | 'tencent' | 'yunpian' | 'records'>('aliyun');
  const [loading, setLoading] = useState(true); // 初始为 true，等待加载
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // 短信记录
  const [smsRecords, setSmsRecords] = useState<SmsRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // 初始状态为空，等待从 API 加载真实配置
  const [configs, setConfigs] = useState<Record<string, SmsApiConfig>>({});

  // 加载配置（组件挂载时立即执行）
  useEffect(() => {
    loadConfigs();
    loadSmsRecords();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);

      // 先尝试从 localStorage 读取缓存（实现快速显示）
      const cached = localStorage.getItem('sms_configs');
      if (cached) {
        try {
          const cachedConfigs = JSON.parse(cached);
          if (Object.keys(cachedConfigs).length > 0) {
            setConfigs(cachedConfigs);
            setLoading(false);
          }
        } catch (e) {
          // 缓存解析失败，继续从 API 加载
        }
      }

      // 从 API 加载最新配置
      const res = await fetch('/api/sms/config');
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        const loadedConfigs: Record<string, SmsApiConfig> = {};
        result.data.forEach((item: any) => {
          if (item.key) {
            loadedConfigs[item.key] = item;
          }
        });

        setConfigs(loadedConfigs);

        // 保存到 localStorage 缓存
        localStorage.setItem('sms_configs', JSON.stringify(loadedConfigs));
      }
    } catch (error) {
      console.error('加载短信配置失败:', error);
      // 加载失败时，如果有缓存就保持缓存，否则显示空状态
    } finally {
      setLoading(false);
    }
  };

  const loadSmsRecords = async () => {
    try {
      setLoadingRecords(true);
      const res = await fetch('/api/sms/records?limit=50');
      const result = await res.json();

      if (result.success && result.data) {
        setSmsRecords(result.data);
      }
    } catch (error) {
      console.error('加载短信记录失败:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleTestSend = async (provider: string) => {
    const testPhone = prompt('请输入测试手机号码：');
    if (!testPhone) return;

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(testPhone)) {
      alert('手机号格式不正确');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          phone: testPhone
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(`短信发送成功！\n验证码: ${result.data.code}\n请求ID: ${result.data.requestId}`);
        // 刷新短信记录
        loadSmsRecords();
      } else {
        alert(`短信发送失败: ${result.error}`);
      }
    } catch (error) {
      console.error('发送测试短信失败:', error);
      alert('发送测试短信失败');
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async (provider: string) => {
    try {
      setSaving(true);
      const config = configs[provider as keyof typeof configs];

      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          signName: config.signName,
          endpoint: config.endpoint,
          enabled: config.enabled,
          defaultTemplate: config.defaultTemplate,
          maxDailyCount: config.maxDailyCount
        })
      });

      const result = await res.json();

      if (result.success) {
        // 保存到 localStorage 缓存
        localStorage.setItem('sms_configs', JSON.stringify(configs));
        alert(`${config.name} 配置已保存`);
      } else {
        alert(`保存失败: ${result.error}`);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchChange = (provider: string, enabled: boolean) => {
    setConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider as keyof typeof prev], enabled }
    }));

    // 自动保存
    setTimeout(() => {
      handleSaveConfig(provider);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">短信API配置系统</h1>
          <p className="text-sm text-gray-600 mt-1">配置短信服务提供商的API密钥和参数</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="aliyun">阿里云短信</TabsTrigger>
          <TabsTrigger value="tencent">腾讯云短信</TabsTrigger>
          <TabsTrigger value="yunpian">云片短信</TabsTrigger>
          <TabsTrigger value="records">发送记录</TabsTrigger>
        </TabsList>

        <TabsContent value="aliyun" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="text-gray-500">加载配置中...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-orange-500" />
                    <CardTitle>阿里云短信配置</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">启用</span>
                    <Switch
                      checked={configs.aliyun?.enabled || false}
                      onCheckedChange={(checked) => handleSwitchChange('aliyun', checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm">AccessKey ID *</Label>
                    <Input value={configs.aliyun?.apiKey || ''} onChange={(e) => setConfigs(prev => ({
                      ...prev,
                      aliyun: { ...prev.aliyun!, apiKey: e.target.value }
                    }))} className="mt-1.5" placeholder="阿里云AccessKey ID" />
                  </div>
                  <div>
                    <Label className="text-sm">AccessKey Secret *</Label>
                    <Input value={configs.aliyun?.apiSecret || ''} onChange={(e) => setConfigs(prev => ({
                      ...prev,
                      aliyun: { ...prev.aliyun!, apiSecret: e.target.value }
                    }))} type="password" className="mt-1.5" placeholder="阿里云AccessKey Secret" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">短信签名 *</Label>
                  <Input value={configs.aliyun?.signName || ''} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    aliyun: { ...prev.aliyun!, signName: e.target.value }
                  }))} className="mt-1.5" placeholder="例如：三角洲行动" />
                  <p className="text-xs text-gray-500 mt-1">需要在阿里云后台审核通过的签名</p>
                </div>

                <div>
                  <Label className="text-sm">API端点</Label>
                  <Input value={configs.aliyun?.endpoint || ''} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    aliyun: { ...prev.aliyun!, endpoint: e.target.value }
                  }))} className="mt-1.5" />
                </div>

                <div>
                  <Label className="text-sm">默认模板CODE</Label>
                  <Input value={configs.aliyun?.defaultTemplate || ''} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    aliyun: { ...prev.aliyun!, defaultTemplate: e.target.value }
                  }))} className="mt-1.5" placeholder="SMS_001" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm">每日发送上限</Label>
                    <Input type="number" value={configs.aliyun?.maxDailyCount || 0} onChange={(e) => setConfigs(prev => ({
                      ...prev,
                      aliyun: { ...prev.aliyun!, maxDailyCount: parseInt(e.target.value) || 0 }
                    }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-sm">今日已发送</Label>
                    <Input type="number" value={configs.aliyun?.currentCount || 0} readOnly className="mt-1.5" disabled />
                  </div>
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-xs text-orange-700">
                    <strong>阿里云短信配置说明：</strong>
                    <br />
                    1. 登录阿里云控制台，开通短信服务
                    <br />
                    2. 创建AccessKey ID和Secret
                    <br />
                    3. 申请短信签名和模板，等待审核
                    <br />
                    4. 将信息填写到配置中
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleSaveConfig('aliyun')} className="flex-1" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                    {saving ? '保存中...' : '保存配置'}
                  </Button>
                  <Button onClick={() => handleTestSend('aliyun')} variant="outline" className="flex-1" disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {sending ? '发送中...' : '发送测试'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tencent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-purple-500" />
                  <CardTitle>腾讯云短信配置</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">启用</span>
                  <Switch
                    checked={configs.tencent?.enabled}
                    onCheckedChange={(checked) => handleSwitchChange('tencent', checked)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm">SecretId *</Label>
                  <Input value={configs.tencent?.apiKey} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    tencent: { ...prev.tencent, apiKey: e.target.value }
                  }))} className="mt-1.5" placeholder="腾讯云SecretId" />
                </div>
                <div>
                  <Label className="text-sm">SecretKey *</Label>
                  <Input value={configs.tencent?.apiSecret} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    tencent: { ...prev.tencent, apiSecret: e.target.value }
                  }))} type="password" className="mt-1.5" placeholder="腾讯云SecretKey" />
                </div>
              </div>

              <div>
                <Label className="text-sm">短信签名 *</Label>
                <Input value={configs.tencent?.signName} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  tencent: { ...prev.tencent, signName: e.target.value }
                }))} className="mt-1.5" placeholder="例如：三角洲行动" />
                <p className="text-xs text-gray-500 mt-1">需要在腾讯云后台审核通过的签名</p>
              </div>

              <div>
                <Label className="text-sm">API端点</Label>
                <Input value={configs.tencent?.endpoint} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  tencent: { ...prev.tencent, endpoint: e.target.value }
                }))} className="mt-1.5" />
              </div>

              <div>
                <Label className="text-sm">默认模板ID</Label>
                <Input value={configs.tencent?.defaultTemplate} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  tencent: { ...prev.tencent, defaultTemplate: e.target.value }
                }))} className="mt-1.5" placeholder="100001" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm">每日发送上限</Label>
                  <Input type="number" value={configs.tencent?.maxDailyCount} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    tencent: { ...prev.tencent, maxDailyCount: parseInt(e.target.value) || 0 }
                  }))} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm">今日已发送</Label>
                  <Input type="number" value={configs.tencent?.currentCount} readOnly className="mt-1.5" disabled />
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-xs text-purple-700">
                  <strong>腾讯云短信配置说明：</strong>
                  <br />
                  1. 登录腾讯云控制台，开通短信服务
                  <br />
                  2. 创建访问密钥SecretId和SecretKey
                  <br />
                  3. 申请短信签名和模板，等待审核
                  <br />
                  4. 将信息填写到配置中
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleSaveConfig('tencent')} className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                  {saving ? '保存中...' : '保存配置'}
                </Button>
                <Button onClick={() => handleTestSend('tencent')} variant="outline" className="flex-1" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? '发送中...' : '发送测试'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yunpian" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-green-500" />
                  <CardTitle>云片短信配置</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">启用</span>
                  <Switch
                    checked={configs.yunpian?.enabled}
                    onCheckedChange={(checked) => handleSwitchChange('yunpian', checked)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">API Key *</Label>
                <Input value={configs.yunpian?.apiKey} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  yunpian: { ...prev.yunpian, apiKey: e.target.value }
                }))} className="mt-1.5" placeholder="云片API Key" />
              </div>

              <div>
                <Label className="text-sm">短信签名 *</Label>
                <Input value={configs.yunpian?.signName} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  yunpian: { ...prev.yunpian, signName: e.target.value }
                }))} className="mt-1.5" placeholder="例如：【三角洲行动】" />
                <p className="text-xs text-gray-500 mt-1">需要在云片后台审核通过的签名，必须包含【】</p>
              </div>

              <div>
                <Label className="text-sm">API端点</Label>
                <Input value={configs.yunpian?.endpoint} onChange={(e) => setConfigs(prev => ({
                  ...prev,
                  yunpian: { ...prev.yunpian, endpoint: e.target.value }
                }))} className="mt-1.5" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm">每日发送上限</Label>
                  <Input type="number" value={configs.yunpian?.maxDailyCount} onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    yunpian: { ...prev.yunpian, maxDailyCount: parseInt(e.target.value) || 0 }
                  }))} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm">今日已发送</Label>
                  <Input type="number" value={configs.yunpian?.currentCount} readOnly className="mt-1.5" disabled />
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-700">
                  <strong>云片短信配置说明：</strong>
                  <br />
                  1. 登录云片官网，注册账号
                  <br />
                  2. 获取API Key
                  <br />
                  3. 申请短信签名，等待审核
                  <br />
                  4. 将信息填写到配置中
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleSaveConfig('yunpian')} className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                  {saving ? '保存中...' : '保存配置'}
                </Button>
                <Button onClick={() => handleTestSend('yunpian')} variant="outline" className="flex-1" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? '发送中...' : '发送测试'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <CardTitle>短信发送记录</CardTitle>
                </div>
                <Button onClick={loadSmsRecords} variant="outline" size="sm" disabled={loadingRecords}>
                  {loadingRecords ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">加载中...</p>
                </div>
              ) : smsRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无发送记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {smsRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                            {record.status === 'success' ? '成功' : '失败'}
                          </Badge>
                          <span className="text-sm font-medium">{record.phone}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="mr-4">服务商: {record.provider}</span>
                          <span className="mr-4">验证码: {record.code}</span>
                          {record.requestId && (
                            <span className="text-xs">ID: {record.requestId.slice(0, 8)}...</span>
                          )}
                        </div>
                        {record.message && (
                          <div className="text-xs text-gray-500 mt-1">{record.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
