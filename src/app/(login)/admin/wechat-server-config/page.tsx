'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';

export default function WechatServerConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState({
    wechatToken: '',
    wechatEncodingAESKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    fetchConfig();
    // 设置服务器地址（仅在客户端）
    if (typeof window !== 'undefined') {
      setServerUrl(`${window.location.origin}/api/wechat/server-verify`);
    }
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/wechat/config', {
        credentials: 'include', // 确保浏览器发送 Cookie
      });

      const result = await response.json();

      if (result.success) {
        setConfig({
          wechatToken: result.data.wechatToken || '',
          wechatEncodingAESKey: result.data.wechatEncodingAESKey || '',
        });
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        } else {
          alert(result.error || '获取配置失败');
        }
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      alert('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch('/api/admin/wechat/update-server-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保浏览器发送 Cookie
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        alert('配置保存成功');
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        } else {
          alert(result.error || '保存配置失败');
        }
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white">
      <AdminHeader
        title="微信开放平台服务器配置"
        showAdminUsers={true}
        showWechatConfig={false}
        showWechatStatus={true}
      />

      <div className="p-6">
        <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">微信开放平台服务器配置</h1>
          <p className="text-gray-600">配置微信开放平台的消息推送服务器，以支持微信扫码登录功能</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">服务器配置</TabsTrigger>
            <TabsTrigger value="guide">配置指南</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>服务器配置信息</CardTitle>
                  <CardDescription>
                    将以下信息填写到微信开放平台的服务器配置中
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="serverUrl">服务器地址 (URL)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="serverUrl"
                        value={serverUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(serverUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">
                        将此地址复制到微信开放平台的"服务器地址(URL)"字段
                      </p>
                      <Alert className="mt-2 border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 text-xs">
                          <strong>注意：</strong>当前显示的是当前页面的地址。如果显示的是 localhost，请手动替换为您的公网域名。
                          <br />
                          示例：https://yourdomain.com/api/wechat/server-verify
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="wechatToken">令牌 (Token)</Label>
                    <Input
                      id="wechatToken"
                      value={config.wechatToken}
                      onChange={(e) => setConfig({ ...config, wechatToken: e.target.value })}
                      placeholder="请输入自定义Token（3-32字符）"
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      自定义Token，长度为3-32字符，只能包含字母和数字
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="encodingAESKey">消息加解密密钥 (EncodingAESKey)</Label>
                    <Input
                      id="encodingAESKey"
                      value={config.wechatEncodingAESKey}
                      onChange={(e) => setConfig({ ...config, wechatEncodingAESKey: e.target.value })}
                      placeholder="请输入随机字符串（43字符）"
                      className="mt-2"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // 生成43位随机字符串
                          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                          let randomStr = '';
                          for (let i = 0; i < 43; i++) {
                            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                          }
                          setConfig({ ...config, wechatEncodingAESKey: randomStr });
                        }}
                      >
                        生成随机密钥
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.wechatEncodingAESKey)}
                        disabled={!config.wechatEncodingAESKey}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        复制
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      43位随机字符串，由字母和数字组成
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={saveConfig}
                      disabled={saveLoading}
                      className="min-w-[120px]"
                    >
                      {saveLoading ? '保存中...' : saved ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          已保存
                        </>
                      ) : (
                        '保存配置'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">重要前提条件</AlertTitle>
                <AlertDescription className="text-amber-800">
                  <ul className="list-disc list-inside mt-2 space-y-2 text-sm">
                    <li><strong>公网域名</strong>：服务器地址必须是公网可访问的域名，不能使用 localhost 或内网IP</li>
                    <li><strong>HTTPS 协议</strong>：微信要求必须使用 HTTPS 协议，不支持 HTTP</li>
                    <li><strong>域名解析</strong>：需要配置域名 A 记录或 CNAME 记录，指向服务器公网IP</li>
                    <li><strong>SSL 证书</strong>：需要配置有效的 SSL 证书（可以使用 Let's Encrypt 免费证书）</li>
                    <li><strong>开发环境</strong>：如果在本地开发，可以使用内网穿透工具（如 ngrok、frp）或部署到云服务器</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>配置说明</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>配置完成后，点击"提交"按钮，微信会发送验证请求到你的服务器</li>
                    <li>验证成功后，服务器配置即生效</li>
                    <li>如果验证失败，请检查服务器地址、Token 和 EncodingAESKey 是否正确</li>
                    <li>确保服务器地址可以被微信服务器访问（公网域名 + HTTPS）</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>配置步骤</CardTitle>
                  <CardDescription>按照以下步骤完成微信开放平台服务器配置</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">前置准备</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                      <li>准备一个公网域名（如 example.com）</li>
                      <li>配置域名 A 记录指向服务器公网 IP</li>
                      <li>配置 HTTPS 证书（推荐使用 Let's Encrypt）</li>
                      <li>确保 80 和 443 端口已开放</li>
                    </ol>
                  </div>

                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">登录微信开放平台</h3>
                        <p className="text-sm text-gray-600">
                          访问 <a href="https://open.weixin.qq.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                            https://open.weixin.qq.com/
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          并登录你的账号
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">进入网站应用详情页</h3>
                        <p className="text-sm text-gray-600">
                          在"管理中心"找到你的网站应用，点击进入详情页
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">找到"开发信息"中的"授权后回调地址"</h3>
                        <p className="text-sm text-gray-600">
                          在"网页开发" → "网站应用微信登录" → "开发信息"中找到"授权后回调地址"
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">配置服务器地址</h3>
                        <p className="text-sm text-gray-600">
                          将服务器地址配置为（必须使用 HTTPS 公网域名）：
                          <code className="block mt-2 p-3 bg-gray-100 rounded text-xs font-mono break-all">
                            https://yourdomain.com/api/wechat/server-verify
                          </code>
                          <span className="text-xs text-gray-500 mt-1 block">注意：请将 yourdomain.com 替换为您的实际域名</span>
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">配置 Token</h3>
                        <p className="text-sm text-gray-600">
                          在"服务器配置"页面的"令牌(Token)"字段中填写自定义Token，例如：<code className="bg-gray-100 px-2 py-1 rounded text-xs">my_wechat_token_2024</code>
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        6
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">配置 EncodingAESKey</h3>
                        <p className="text-sm text-gray-600">
                          点击"随机生成"按钮或手动输入43位随机字符串
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        7
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">在本页面保存配置</h3>
                        <p className="text-sm text-gray-600">
                          将 Token 和 EncodingAESKey 填写到本页面并保存，确保与微信开放平台的配置一致
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        8
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">在微信开放平台提交</h3>
                        <p className="text-sm text-gray-600">
                          点击"提交"按钮，微信会发送验证请求到你的服务器
                        </p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>域名解析配置</CardTitle>
                  <CardDescription>如何配置域名解析到服务器</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">步骤 1：获取服务器公网 IP</h4>
                      <p className="text-sm text-gray-600">
                        登录您的云服务器（阿里云、腾讯云等），查看服务器的公网 IP 地址
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">步骤 2：配置域名解析</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        登录域名服务商（如阿里云、腾讯云、GoDaddy）的控制台，找到域名解析设置
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">添加 A 记录：</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1">记录类型</th>
                              <th className="text-left py-1">主机记录</th>
                              <th className="text-left py-1">记录值</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1">A</td>
                              <td className="py-1">@（或 www）</td>
                              <td className="py-1">服务器公网 IP</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">步骤 3：配置 HTTPS 证书</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        使用 Nginx 配置 SSL 证书，推荐使用 Let's Encrypt 免费证书
                      </p>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          如果使用内网穿透工具（如 ngrok），会自动提供 HTTPS 域名和证书，无需手动配置
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>常见问题</CardTitle>
                  <CardDescription>解决配置过程中的常见问题</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Token 校验失败</AlertTitle>
                    <AlertDescription>
                      <p className="text-sm mt-2">
                        可能的原因：
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
                        <li>服务器地址不正确，请检查是否使用了 HTTPS 协议</li>
                        <li>Token 配置不一致，确保微信开放平台的 Token 与你保存的 Token 完全相同</li>
                        <li>服务器无法访问，请检查服务器是否正常运行</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>服务器地址要求</AlertTitle>
                    <AlertDescription className="text-sm mt-2">
                      <ul className="list-disc list-inside space-y-1">
                        <li>必须使用 HTTPS 协议</li>
                        <li>服务器必须能够正常响应 GET 请求</li>
                        <li>服务器必须返回微信发送的 echostr 参数值</li>
                        <li>响应时间建议在 5 秒以内</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Token 和 EncodingAESKey 的说明</AlertTitle>
                    <AlertDescription className="text-sm mt-2">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Token</strong>：自定义的令牌，用于验证服务器身份，长度3-32字符，只能包含字母和数字</li>
                        <li><strong>EncodingAESKey</strong>：用于消息加解密的密钥，长度43字符，由字母和数字组成</li>
                        <li>这两个参数都需要在微信开放平台和你的服务器中保持一致</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
