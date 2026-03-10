'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';

interface ConfigStatus {
  mpConfigured: boolean;
  openConfigured: boolean;
  serverConfigured: boolean;
  redirectUri: string;
  serverUrl: string;
}

export default function WechatStatusPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wechat/status');
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
      } else {
        alert(result.error || '获取配置状态失败');
      }
    } catch (error) {
      console.error('获取配置状态失败:', error);
      alert('获取配置状态失败');
    } finally {
      setLoading(false);
    }
  };

  const testServerVerify = async () => {
    setTesting(true);
    try {
      // 模拟微信验证请求
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = Math.random().toString(36).substring(2, 10);
      const echostr = Math.random().toString(36).substring(2, 10);

      const response = await fetch(`/api/wechat/server-verify?timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`);
      const text = await response.text();

      if (text === echostr) {
        alert('✅ 服务器验证接口正常！Token 配置正确。');
      } else if (text.includes('Token 未配置')) {
        alert('⚠️ Token 未配置，请先在"微信服务器配置"页面配置 Token。');
      } else {
        alert(`❌ 服务器验证接口异常：${text}`);
      }
    } catch (error) {
      console.error('测试失败:', error);
      alert('测试失败，请检查服务器是否正常运行');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mb-4" />
            <p className="text-slate-600">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-slate-600">无法获取配置状态</p>
            <Button onClick={checkStatus} className="mt-4">
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white">
      <AdminHeader
        title="微信登录配置状态"
        showAdminUsers={true}
        showWechatConfig={true}
        showWechatStatus={false}
      />

      <div className="p-6">
        <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">微信登录配置状态</h1>
          <p className="text-gray-600">查看和测试微信登录配置</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>配置状态检查</CardTitle>
              <CardDescription>检查微信登录相关的配置是否完整</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {status.mpConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">微信公众号配置</p>
                    <p className="text-sm text-gray-500">AppID 和 AppSecret</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${status.mpConfigured ? 'text-green-600' : 'text-red-600'}`}>
                  {status.mpConfigured ? '已配置' : '未配置'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {status.openConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">微信开放平台配置</p>
                    <p className="text-sm text-gray-500">用于扫码登录</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${status.openConfigured ? 'text-green-600' : 'text-red-600'}`}>
                  {status.openConfigured ? '已配置' : '未配置'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {status.serverConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">服务器配置</p>
                    <p className="text-sm text-gray-500">Token 和 EncodingAESKey</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${status.serverConfigured ? 'text-green-600' : 'text-red-600'}`}>
                  {status.serverConfigured ? '已配置' : '未配置'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>配置信息</CardTitle>
              <CardDescription>微信登录相关的配置信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">授权回调地址</label>
                <div className="mt-1 p-3 bg-gray-100 rounded font-mono text-sm break-all">
                  {status.redirectUri}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  此地址需要在微信开放平台配置为"授权后回调地址"
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">服务器验证地址</label>
                <div className="mt-1 p-3 bg-gray-100 rounded font-mono text-sm break-all">
                  {status.serverUrl}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  此地址需要在微信开放平台配置为"服务器地址(URL)"
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>测试服务器验证</CardTitle>
              <CardDescription>测试微信服务器验证接口是否正常工作</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={testServerVerify} disabled={testing}>
                  {testing ? '测试中...' : '测试验证接口'}
                </Button>
                <Button variant="outline" onClick={checkStatus}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新状态
                </Button>
              </div>
            </CardContent>
          </Card>

          {!status.serverConfigured && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>服务器配置未完成</AlertTitle>
              <AlertDescription>
                请前往{' '}
                <a href="/admin/wechat-server-config" className="text-indigo-600 hover:underline font-medium">
                  微信服务器配置页面
                </a>
                {' '}完成服务器配置，以启用微信登录功能。
              </AlertDescription>
            </Alert>
          )}

          {status.mpConfigured && status.openConfigured && status.serverConfigured && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>配置已完成</AlertTitle>
              <AlertDescription>
                微信登录配置已完成，现在可以使用微信扫码登录和授权登录功能了。
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>配置说明</AlertTitle>
            <AlertDescription className="text-sm mt-2">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>微信公众号配置</strong>：在"微信开放平台 → 网站应用 → 开发信息"中配置 AppID 和 AppSecret</li>
                <li><strong>微信开放平台配置</strong>：用于 PC 端扫码登录，需要开放平台账号</li>
                <li><strong>服务器配置</strong>：配置 Token 和 EncodingAESKey，用于验证服务器身份</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
        </div>
      </div>
    </div>
  );
}
