'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Copy, RefreshCw } from 'lucide-react';

export default function WechatDebugPage() {
  const [loading, setLoading] = useState(false);
  const [qrLoginUrl, setQrLoginUrl] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // 获取配置
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/wechat/config');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
      } else {
        toast.error('获取配置失败: ' + result.error);
      }
    } catch (error: any) {
      toast.error('获取配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 生成二维码URL
  const generateQrUrl = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/wechat/qr-login-url');
      const data = await response.json();

      if (data.success) {
        setQrLoginUrl(data.qrLoginUrl);
        setTestResults({
          qrUrlGenerated: true,
          qrUrl: data.qrLoginUrl,
          state: data.state,
          urlParams: parseUrlParams(data.qrLoginUrl)
        });
      } else {
        toast.error('生成二维码URL失败: ' + data.error);
      }
    } catch (error: any) {
      toast.error('生成二维码URL失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 解析URL参数
  const parseUrlParams = (url: string) => {
    try {
      const params = new URLSearchParams(url.split('?')[1]);
      return {
        appid: params.get('appid'),
        redirect_uri: params.get('redirect_uri'),
        response_type: params.get('response_type'),
        scope: params.get('scope'),
        state: params.get('state')
      };
    } catch (error) {
      return null;
    }
  };

  // 直接测试微信授权URL
  const testWechatAuth = () => {
    if (!qrLoginUrl) {
      toast.error('请先生成二维码URL');
      return;
    }
    window.open(qrLoginUrl, '_blank');
  };

  // 复制URL
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('已复制到剪贴板');
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">微信登录调试工具</h1>
        <p className="text-gray-600">用于诊断微信扫码登录配置问题</p>
      </div>

      {/* 配置信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            当前配置
          </CardTitle>
          <CardDescription>从数据库中读取的微信登录配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>开放平台 AppID</Label>
                  <Input
                    value={config.wechatOpenAppId || '未配置'}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>开放平台 AppSecret</Label>
                  <Input
                    value={config.wechatOpenAppSecret ? config.wechatOpenAppSecret.substring(0, 8) + '...' : '未配置'}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>公众号 AppID</Label>
                  <Input
                    value={config.wechatMpAppId || '未配置'}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>公众号 AppSecret</Label>
                  <Input
                    value={config.wechatMpAppSecret ? config.wechatMpAppSecret.substring(0, 8) + '...' : '未配置'}
                    readOnly
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>回调地址（redirect_uri）</Label>
                <Input
                  value={config.redirectUri || '未配置'}
                  readOnly
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchConfig} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新配置
                </Button>
                {config.redirectUri && (
                  <Button variant="outline" onClick={() => copyUrl(config.redirectUri)}>
                    <Copy className="h-4 w-4 mr-2" />
                    复制回调地址
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500">正在加载配置...</p>
          )}
        </CardContent>
      </Card>

      {/* 二维码URL生成测试 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>二维码URL生成测试</CardTitle>
          <CardDescription>测试微信扫码登录URL的生成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateQrUrl} disabled={loading}>
              生成二维码URL
            </Button>
            {qrLoginUrl && (
              <>
                <Button variant="outline" onClick={testWechatAuth}>
                  直接打开测试
                </Button>
                <Button variant="outline" onClick={() => copyUrl(qrLoginUrl)}>
                  <Copy className="h-4 w-4 mr-2" />
                  复制URL
                </Button>
              </>
            )}
          </div>

          {testResults && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">二维码URL生成成功</p>
                    <p className="text-sm text-green-700 mt-1">
                      State: {testResults.state}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>URL参数</Label>
                <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div><strong>appid:</strong> {testResults.urlParams?.appid}</div>
                  <div><strong>redirect_uri:</strong> {testResults.urlParams?.redirect_uri}</div>
                  <div><strong>response_type:</strong> {testResults.urlParams?.response_type}</div>
                  <div><strong>scope:</strong> {testResults.urlParams?.scope}</div>
                  <div><strong>state:</strong> {testResults.urlParams?.state}</div>
                </div>
              </div>

              <div>
                <Label>完整URL</Label>
                <textarea
                  className="mt-1 w-full h-32 p-3 border rounded-lg text-xs font-mono bg-gray-50"
                  value={testResults.qrUrl}
                  readOnly
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配置检查清单 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>配置检查清单</CardTitle>
          <CardDescription>请逐一检查以下配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input type="checkbox" id="check1" className="mt-1" />
              <label htmlFor="check1" className="text-sm">
                <strong>应用状态已上线：</strong>登录微信开放平台，确认应用状态为"已上线"
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="check2" className="mt-1" />
              <label htmlFor="check2" className="text-sm">
                <strong>回调域名配置正确：</strong>在"开发设置"中配置的授权回调域名为 <code className="bg-gray-100 px-1 rounded">hfb.yugioh.top</code>（不包含https和路径）
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="check3" className="mt-1" />
              <label htmlFor="check3" className="text-sm">
                <strong>网站信息完整：</strong>网站名称、描述、域名、Logo、截图等信息都已填写并通过审核
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="check4" className="mt-1" />
              <label htmlFor="check4" className="text-sm">
                <strong>网站已备案：</strong>域名 <code className="bg-gray-100 px-1 rounded">hfb.yugioh.top</code> 已在工信部备案
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="check5" className="mt-1" />
              <label htmlFor="check5" className="text-sm">
                <strong>AppID正确：</strong>使用的是"网站应用"的AppID，而不是"移动应用"或"公众号"的AppID
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 常见错误 */}
      <Card>
        <CardHeader>
          <CardTitle>常见错误及解决方案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">扫码后跳转回二维码页面</p>
                <p className="text-sm text-red-700 mt-1">
                  原因：回调域名配置错误或应用审核未通过<br />
                  解决方案：检查回调域名是否为 <code className="bg-red-100 px-1 rounded">hfb.yugioh.top</code>，确认应用已上线
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-900">点击后404</p>
                <p className="text-sm text-yellow-700 mt-1">
                  原因：测试URL格式错误，缺少 <code className="bg-yellow-100 px-1 rounded">&</code> 符号<br />
                  解决方案：使用"生成二维码URL"按钮生成的正确URL
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">正常流程</p>
                <p className="text-sm text-blue-700 mt-1">
                  1. 扫码后微信显示中间页面（网站名+二维码+确认按钮）<br />
                  2. 点击"确认登录"<br />
                  3. 微信跳转回 <code className="bg-blue-100 px-1 rounded">https://hfb.yugioh.top/api/auth/wechat/callback</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
