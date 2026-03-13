'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Save, Eye, EyeOff, ChevronDown, ChevronUp, ChevronRight, Info, Upload, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentConfig {
  id: string;
  configType: string;
  configKey: string;
  configValue: string;
  isEncrypted: boolean;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WechatFormData {
  appid: string;
  mch_id: string;
  api_key: string;
  notify_url: string;
  mp_appid: string;
  mp_secret: string;
  cert_path: string;
  key_path: string;
  cert_p12_password: string;
  cert_serial_no: string;
}

interface ConfigCheckData {
  configured: boolean;
  missingFields: string[];
  certConfigured: boolean;
  certMissing: string[];
  appId?: string;
  mchId?: string;
  notifyUrl?: string;
}

export default function AdminPayments() {
  const [wechatConfigs, setWechatConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWechatConfig, setShowWechatConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // 微信配置表单相关
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showConfigCheck, setShowConfigCheck] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [configCheck, setConfigCheck] = useState<ConfigCheckData | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [reconcilingPayments, setReconcilingPayments] = useState(false);

  const [formData, setFormData] = useState<WechatFormData>({
    appid: '',
    mch_id: '',
    api_key: '',
    notify_url: 'https://hfb.yugioh.top/api/payment/wechat/notify',
    mp_appid: '',
    mp_secret: '',
    cert_path: '',
    key_path: '',
    cert_p12_password: '',
    cert_serial_no: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async (showSensitive = false) => {
    try {
      if (!showSensitive) setLoading(true);
      const response = await fetch(`/api/admin/payment/configs?type=wechat&show_sensitive=${showSensitive}`);
      const result = await response.json();

      if (result.success) {
        if (!showSensitive) {
          // 加载隐藏版本，用于卡片概览
          setWechatConfigs(result.data);
        } else {
          // 加载完整版本，用于表单
          setConfigLoaded(true);

          // 检查是否缺少证书配置
          const certKeys = ['cert_path', 'key_path', 'cert_p12_password', 'cert_serial_no'];
          const existingKeys = result.data.map((c: PaymentConfig) => c.configKey);
          const missingCertConfigs = certKeys.filter(key => !existingKeys.includes(key));

          // 如果缺少证书配置，自动初始化
          if (missingCertConfigs.length > 0) {
            await initCertConfigs();
            // 重新加载配置
            const retryResponse = await fetch('/api/admin/payment/configs?type=wechat&show_sensitive=true');
            const retryResult = await retryResponse.json();
            if (retryResult.success) {
              const data: WechatFormData = {
                appid: '',
                mch_id: '',
                api_key: '',
                notify_url: 'https://hfb.yugioh.top/api/payment/wechat/notify',
                mp_appid: '',
                mp_secret: '',
                cert_path: '',
                key_path: '',
                cert_p12_password: '',
                cert_serial_no: '',
              };

              retryResult.data.forEach((config: PaymentConfig) => {
                const key = config.configKey as keyof WechatFormData;
                if (config.configValue) {
                  data[key] = config.configValue;
                }
              });

              setFormData(data);
            }
          } else {
            // 填充表单数据
            const data: WechatFormData = {
              appid: '',
              mch_id: '',
              api_key: '',
              notify_url: 'https://hfb.yugioh.top/api/payment/wechat/notify',
              mp_appid: '',
              mp_secret: '',
              cert_path: '',
              key_path: '',
              cert_p12_password: '',
              cert_serial_no: '',
            };

            result.data.forEach((config: PaymentConfig) => {
              const key = config.configKey as keyof WechatFormData;
              if (config.configValue) {
                data[key] = config.configValue;
              }
            });

            setFormData(data);
          }
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      if (!showSensitive) setLoading(false);
    }
  };

  const getWechatConfigStatus = () => {
    const requiredKeys = ['appid', 'mch_id', 'api_key', 'notify_url'];
    const hasRequiredKeys = requiredKeys.every(key =>
      wechatConfigs.some(c => c.configKey === key && c.configValue)
    );

    if (hasRequiredKeys && wechatConfigs.length >= 6) {
      return 'configured';
    } else if (wechatConfigs.length > 0) {
      return 'partial';
    } else {
      return 'not_configured';
    }
  };

  const checkConfig = async () => {
    try {
      setCheckingConfig(true);
      const response = await fetch('/api/payment/wechat/config');
      const data = await response.json();
      if (data.success) {
        setConfigCheck(data.data);
      } else {
        toast.error(data.error || '配置检查失败');
      }
    } catch (err) {
      toast.error('配置检查失败');
    } finally {
      setCheckingConfig(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.appid || !formData.mch_id || !formData.api_key) {
        toast.error('请填写必填配置项');
        return;
      }

      const configsToSave = [
        {
          configType: 'wechat',
          configKey: 'appid',
          configValue: formData.appid,
          description: '微信应用ID',
        },
        {
          configType: 'wechat',
          configKey: 'mch_id',
          configValue: formData.mch_id,
          description: '微信商户号',
        },
        {
          configType: 'wechat',
          configKey: 'api_key',
          configValue: formData.api_key,
          description: '微信支付API密钥',
        },
        {
          configType: 'wechat',
          configKey: 'notify_url',
          configValue: formData.notify_url,
          description: '支付回调地址',
        },
        {
          configType: 'wechat',
          configKey: 'mp_appid',
          configValue: formData.mp_appid,
          description: '公众号AppID',
        },
        {
          configType: 'wechat',
          configKey: 'mp_secret',
          configValue: formData.mp_secret,
          description: '公众号AppSecret',
        },
        {
          configType: 'wechat',
          configKey: 'cert_path',
          configValue: formData.cert_path,
          description: '证书路径',
        },
        {
          configType: 'wechat',
          configKey: 'key_path',
          configValue: formData.key_path,
          description: '密钥路径',
        },
        {
          configType: 'wechat',
          configKey: 'cert_p12_password',
          configValue: formData.cert_p12_password,
          description: '证书密码',
        },
        {
          configType: 'wechat',
          configKey: 'cert_serial_no',
          configValue: formData.cert_serial_no,
          description: '证书序列号',
        },
      ].filter(config => config.configValue && !config.configValue.includes('***'));

      const response = await fetch('/api/admin/payment/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('支付配置已保存');
        // 重新加载配置：隐藏版本（用于卡片）和完整版本（用于表单）
        await loadConfigs(false);
        await loadConfigs(true);
        checkConfig();
      } else {
        toast.error(result.error || '保存配置失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof WechatFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleReconcileRechargePayments = async () => {
    try {
      setReconcilingPayments(true);
      const response = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 30 }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '支付对账失败');
        return;
      }

      const { total, successCount, failedCount } = result.data;
      toast.success(`支付对账完成：共 ${total} 笔，成功 ${successCount} 笔，失败 ${failedCount} 笔`);
    } catch (error) {
      console.error('支付对账失败:', error);
      toast.error('支付对账失败');
    } finally {
      setReconcilingPayments(false);
    }
  };

  const handleCertUpload = async (event: React.ChangeEvent<HTMLInputElement>, certType: 'p12' | 'cert' | 'key') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (certType === 'p12' && ext !== 'p12') {
      toast.error('请上传 .p12 格式的证书文件');
      return;
    }
    if ((certType === 'cert' || certType === 'key') && ext !== 'pem') {
      toast.error('请上传 .pem 格式的证书文件');
      return;
    }

    try {
      setUploadingCert(true);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/payment/cert-upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        const certInfo = result.data;

        if (certType === 'p12') {
          handleInputChange('cert_path', certInfo.path);
          if (certInfo.serialNumber) {
            handleInputChange('cert_serial_no', certInfo.serialNumber);
          }
        } else if (certType === 'cert') {
          handleInputChange('cert_path', certInfo.path);
        } else if (certType === 'key') {
          handleInputChange('key_path', certInfo.path);
        }

        toast.success('证书上传成功');
      } else {
        toast.error(result.error || '证书上传失败');
      }
    } catch (error: any) {
      console.error('证书上传失败:', error);
      toast.error('证书上传失败');
    } finally {
      setUploadingCert(false);
    }
  };

  const initCertConfigs = async () => {
    try {
      await fetch('/api/admin/payment/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { configType: 'wechat', configKey: 'cert_path', configValue: '', description: '证书路径' },
            { configType: 'wechat', configKey: 'key_path', configValue: '', description: '密钥路径' },
            { configType: 'wechat', configKey: 'cert_p12_password', configValue: '', description: '证书密码' },
            { configType: 'wechat', configKey: 'cert_serial_no', configValue: '', description: '证书序列号' },
          ],
        }),
      });
    } catch (error) {
      console.error('初始化证书配置失败:', error);
    }
  };

  const isConfigured = formData.appid && formData.mch_id && formData.api_key;
  const status = getWechatConfigStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">支付配置管理</h1>
        <p className="text-sm text-gray-600 mt-1">管理平台的支付方式和相关配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>支付对账</CardTitle>
          <CardDescription>
            正常到账以微信异步回调为准。这里仅用于处理历史异常单，不会在用户钱包页面实时执行。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            会对最近待处理的微信充值记录执行一次后台查单补偿。
          </p>
          <Button onClick={handleReconcileRechargePayments} disabled={reconcilingPayments}>
            {reconcilingPayments ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                对账中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                立即对账
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 支付方式概览 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 微信支付 */}
        <Card className="border-2 transition-all hover:shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>微信支付</CardTitle>
                  <CardDescription>支持扫码支付和JSAPI支付</CardDescription>
                </div>
              </div>
              {status === 'configured' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {status === 'partial' && (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              {status === 'not_configured' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 状态提示 */}
            {status === 'configured' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">已配置</AlertTitle>
                <AlertDescription className="text-green-700">
                  微信支付已正常配置，可以使用
                </AlertDescription>
              </Alert>
            )}
            {status === 'partial' && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-900">配置不完整</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  请完善配置后才能正常使用
                </AlertDescription>
              </Alert>
            )}
            {status === 'not_configured' && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-900">未配置</AlertTitle>
                <AlertDescription className="text-red-700">
                  需要先配置支付参数才能使用
                </AlertDescription>
              </Alert>
            )}

            {/* 配置信息概览 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">配置项数量</span>
                <span className="font-medium">{wechatConfigs.length}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">必需配置</span>
                <span className={status === 'configured' ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                  {status === 'configured' ? '✓ 已配置' : '✗ 未配置'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">证书配置</span>
                <span className="font-medium">
                  {wechatConfigs.some(c => c.configKey === 'cert_path' && c.configValue) ? '已配置' : '未配置'}
                </span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!showWechatConfig && !configLoaded) {
                    // 展开时，如果还没加载完整配置，则加载完整版本
                    await loadConfigs(true);
                  }
                  setShowWechatConfig(!showWechatConfig);
                  if (!showWechatConfig && !configCheck) {
                    checkConfig();
                  }
                }}
                className="flex-1"
                variant={status === 'configured' ? 'outline' : 'default'}
              >
                {showWechatConfig ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    收起配置
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    {status === 'not_configured' ? '开始配置' : '管理配置'}
                  </>
                )}
              </Button>
              <Button
                onClick={() => loadConfigs(false)}
                variant="outline"
                size="icon"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* 配置检查结果（可折叠） */}
            <Collapsible open={showConfigCheck} onOpenChange={setShowConfigCheck} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {showConfigCheck ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                  {configCheck ? '配置检查结果' : '点击查看配置检查结果'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                {checkingConfig ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : configCheck ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">基础配置</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          {configCheck.appId ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>AppID {configCheck.appId && `(${configCheck.appId})`}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {configCheck.mchId ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>商户号 {configCheck.mchId && `(${configCheck.mchId})`}</span>
                        </div>
                      </div>
                      {configCheck.missingFields.length > 0 && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>缺少配置项</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside mt-1">
                              {configCheck.missingFields.map((field, index) => (
                                <li key={index}>{field}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">证书配置</h4>
                      {configCheck.certConfigured ? (
                        <Alert className="border-green-500 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-600">证书配置完整</AlertTitle>
                          <AlertDescription className="text-green-700">
                            所有证书文件已正确配置，可以使用退款功能。
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertTitle>证书配置不完整</AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">缺少以下证书文件：</p>
                            <ul className="list-disc list-inside">
                              {configCheck.certMissing.map((file, index) => (
                                <li key={index}>{file}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>

          {/* 配置表单（可折叠） */}
          <Collapsible open={showWechatConfig} onOpenChange={setShowWechatConfig}>
            <CollapsibleContent className="border-t p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appid">
                    AppID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="appid"
                    value={formData.appid}
                    onChange={(e) => handleInputChange('appid', e.target.value)}
                    placeholder="wxXXXXXXXXXXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-sm text-slate-600">微信应用 ID</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mch_id">
                    商户号 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mch_id"
                    value={formData.mch_id}
                    onChange={(e) => handleInputChange('mch_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-sm text-slate-600">微信支付商户号</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">
                    API 密钥 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="api_key"
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.api_key}
                      onChange={(e) => handleInputChange('api_key', e.target.value)}
                      placeholder="32位密钥，仅字母和数字"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">32位密钥，仅包含字母和数字</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notify_url">回调地址</Label>
                  <Input
                    id="notify_url"
                    value={formData.notify_url}
                    onChange={(e) => handleInputChange('notify_url', e.target.value)}
                    placeholder="https://hfb.yugioh.top/api/payment/wechat/notify"
                    className="font-mono"
                  />
                  <p className="text-sm text-slate-600">支付结果通知地址</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mp_appid">公众号 AppID</Label>
                  <Input
                    id="mp_appid"
                    value={formData.mp_appid}
                    onChange={(e) => handleInputChange('mp_appid', e.target.value)}
                    placeholder="wxXXXXXXXXXXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-sm text-slate-600">用于微信扫码登录等功能</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mp_secret">公众号 AppSecret</Label>
                  <Input
                    id="mp_secret"
                    type="password"
                    value={formData.mp_secret}
                    onChange={(e) => handleInputChange('mp_secret', e.target.value)}
                    placeholder="公众号 AppSecret"
                    className="font-mono"
                  />
                  <p className="text-sm text-slate-600">公众号应用密钥</p>
                </div>

                {/* 证书配置 */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">证书配置（用于退款等功能）</h4>

                  <Alert className="mb-4 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">证书上传</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      推荐使用上传功能，系统会自动解析证书信息并填充相关字段
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="cert_path_upload">证书文件（.p12 或 .pem）</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cert_path"
                        value={formData.cert_path}
                        onChange={(e) => handleInputChange('cert_path', e.target.value)}
                        placeholder="/workspace/projects/certs/wechat/apiclient_cert.pem"
                        className="font-mono"
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById('cert_path_upload')?.click()}
                        disabled={uploadingCert}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <input
                        id="cert_path_upload"
                        type="file"
                        accept=".p12,.pem"
                        onChange={(e) => handleCertUpload(e, 'p12')}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      上传 .p12 或 .pem 格式的证书文件，系统会自动解析并填充路径和序列号
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="key_path_upload">私钥文件（.pem）</Label>
                    <div className="flex gap-2">
                      <Input
                        id="key_path"
                        value={formData.key_path}
                        onChange={(e) => handleInputChange('key_path', e.target.value)}
                        placeholder="/workspace/projects/certs/wechat/apiclient_key.pem"
                        className="font-mono"
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById('key_path_upload')?.click()}
                        disabled={uploadingCert}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <input
                        id="key_path_upload"
                        type="file"
                        accept=".pem"
                        onChange={(e) => handleCertUpload(e, 'key')}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-slate-600">上传 .pem 格式的私钥文件</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="cert_p12_password">证书密码</Label>
                    <Input
                      id="cert_p12_password"
                      type="password"
                      value={formData.cert_p12_password}
                      onChange={(e) => handleInputChange('cert_p12_password', e.target.value)}
                      placeholder="证书密码"
                      className="font-mono"
                    />
                    <p className="text-sm text-slate-600">.p12 证书文件的密码，通常就是商户号</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cert_serial_no">证书序列号</Label>
                    <Input
                      id="cert_serial_no"
                      value={formData.cert_serial_no}
                      onChange={(e) => handleInputChange('cert_serial_no', e.target.value)}
                      placeholder="上传证书后自动填充"
                      className="font-mono"
                      readOnly
                    />
                    <p className="text-sm text-slate-600">上传证书后自动填充，也可手动输入</p>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存配置
                    </>
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* 支付宝 - 未实现 */}
        <Card className="border-2 border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.984 12.912c-1.176.144-2.264.384-3.264.696 1.704 5.208 6.384 9.6 12.096 10.8 0-3.504-.48-6.696-1.392-9.6-2.136-.384-4.56-.6-7.44-.896zm9.408 1.104c.72 2.736 1.152 5.76 1.152 9.216 5.4-1.776 9.552-6.432 10.488-11.904-3.312-1.248-7.392-2.112-11.64-2.544V14.016zm-1.224-3.6c-2.808.144-5.472.504-7.8 1.056C8.256 8.4 8.688 5.952 9.456 3.6c-4.8.96-8.736 4.656-9.984 9.456 2.952 2.376 7.68 4.008 13.92 4.68 0-2.304-.216-4.464-.504-6.432h2.28zM10.8 3.36c-.768 2.376-1.224 4.896-1.44 7.536-2.904.72-5.424 1.8-7.32 3.24C2.64 12.72 3.408 11.28 4.56 10.08c2.088-2.184 4.872-3.936 8.16-4.992l-1.92-1.728zM19.8 10.992c-.12-3.696-2.232-6.864-5.472-8.64.96 2.328 1.608 4.944 1.848 7.8 1.2.12 2.376.264 3.528.408l.096.432z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>支付宝</CardTitle>
                  <CardDescription className="text-gray-500">暂未开放</CardDescription>
                </div>
              </div>
              <XCircle className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-gray-50 border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <AlertTitle className="text-gray-900">开发中</AlertTitle>
              <AlertDescription className="text-gray-700">
                支付宝支付功能正在开发中，敬请期待
              </AlertDescription>
            </Alert>

            <div className="text-sm text-gray-500">
              <p>计划支持的支付方式：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>扫码支付</li>
                <li>网站支付</li>
                <li>移动支付</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 配置说明（Accordion） */}
      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
          <CardDescription>
            如何获取微信支付配置信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="important">
              <AccordionTrigger>注意事项</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2">
                  <li>配置信息存储在数据库中，无需修改环境变量</li>
                  <li>配置后立即生效，无需重启服务器</li>
                  <li>API 密钥请妥善保管，建议定期更换</li>
                  <li>配置回调域名时，使用：hfb.yugioh.top</li>
                  <li>敏感信息（如 API 密钥）加载时会自动隐藏，保存后不会丢失</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step1">
              <AccordionTrigger>步骤 1：登录微信支付商户平台</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">
                  访问 <a href="https://pay.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">pay.weixin.qq.com</a>，使用商户账号登录
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger>步骤 2：获取 AppID 和商户号</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">在"账户中心"中查看 AppID 和商户号</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger>步骤 3：设置 API 密钥</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">
                  在"账户中心" → "API安全"中设置 API 密钥（32位，仅字母和数字）
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4">
              <AccordionTrigger>步骤 4：配置支付授权目录</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">
                  在"产品中心" → "开发配置"中，设置支付授权目录为：https://hfb.yugioh.top/
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step5">
              <AccordionTrigger>步骤 5：配置回调域名</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">
                  在"产品中心" → "开发配置"中，设置回调域名为：hfb.yugioh.top
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step6">
              <AccordionTrigger>步骤 6：下载商户证书（退款功能必需）</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">
                  在"账户中心" → "API安全"中下载商户证书（apiclient_cert.p12），密码为商户号
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
