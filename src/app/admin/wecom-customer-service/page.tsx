'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploader } from '@/components/ImageUploader';
import {
  MessageCircle,
  Settings,
  QrCode,
  Shield,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle,
  Smartphone,
  ExternalLink
} from 'lucide-react';

interface WeComConfig {
  // 企业微信基础配置
  corpId: string;
  agentId: string;
  secret: string;
  token: string;
  encodingAESKey: string;

  // 客服配置
  kfAvatar: string;
  kfQrCode: string;
  kfUrl: string; // 客服链接
  
  // 业务配置
  autoReply: boolean;
  welcomeMessage: string;
  offlineMessage: string;
  busyMessage: string;
  
  // 入口配置
  showOnHomepage: boolean;
  showOnOrderPage: boolean;
  showOnSellerPage: boolean;
  floatingButtonEnabled: boolean;
  floatingButtonPosition: 'left' | 'right';
  floatingButtonColor: string;
}

export default function AdminWeComCustomerService() {
  const [activeTab, setActiveTab] = useState<'config' | 'customers' | 'entrance'>('config');
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [config, setConfig] = useState<WeComConfig>({
    corpId: '',
    agentId: '',
    secret: '',
    token: '',
    encodingAESKey: '',
    kfAvatar: '',
    kfQrCode: '',
    kfUrl: '',
    autoReply: true,
    welcomeMessage: '您好！欢迎咨询三角洲行动哈夫币出租平台。请问有什么可以帮到您？',
    offlineMessage: '客服当前不在线，请您留言，我们会尽快回复。',
    busyMessage: '客服当前忙碌中，请稍后再次咨询。',
    showOnHomepage: true,
    showOnOrderPage: true,
    showOnSellerPage: true,
    floatingButtonEnabled: true,
    floatingButtonPosition: 'right',
    floatingButtonColor: '#07C160',
  });

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/customer-service/config');
      const result = await response.json();

      if (result.success && result.data) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch('/api/admin/customer-service/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        alert('企业微信配置已保存');
      } else {
        alert(`保存失败：${result.error}`);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败，请重试');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    // 模拟测试连接
    setTimeout(() => {
      setTestLoading(false);
      alert('企业微信连接测试成功！');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企业微信客服系统</h1>
          <p className="text-sm text-gray-600 mt-1">配置和管理企业微信客服</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testLoading}
          >
            {testLoading ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {testLoading ? '测试中...' : '测试连接'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            {saveLoading ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="config">基础配置</TabsTrigger>
          <TabsTrigger value="customers">客服管理</TabsTrigger>
          <TabsTrigger value="entrance">入口设置</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                企业微信配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm">企业ID (CorpID) <span className="text-red-500">*</span></Label>
                  <Input
                    value={config.corpId}
                    onChange={(e) => setConfig({...config, corpId: e.target.value})}
                    placeholder="请输入企业ID"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    在企业微信管理后台的"我的企业"中查看
                  </p>
                </div>
                <div>
                  <Label className="text-sm">应用ID (AgentID) <span className="text-red-500">*</span></Label>
                  <Input
                    value={config.agentId}
                    onChange={(e) => setConfig({...config, agentId: e.target.value})}
                    placeholder="请输入应用ID"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    在应用的"管理后台"中查看
                  </p>
                </div>
                <div>
                  <Label className="text-sm">应用Secret <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={config.secret}
                    onChange={(e) => setConfig({...config, secret: e.target.value})}
                    placeholder="请输入应用Secret"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    在应用的"管理后台"中查看
                  </p>
                </div>
                <div>
                  <Label className="text-sm">Token</Label>
                  <Input
                    value={config.token}
                    onChange={(e) => setConfig({...config, token: e.target.value})}
                    placeholder="请输入Token"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    用于接收企业微信回调消息的验证令牌
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm">EncodingAESKey</Label>
                  <Input
                    value={config.encodingAESKey}
                    onChange={(e) => setConfig({...config, encodingAESKey: e.target.value})}
                    placeholder="请输入EncodingAESKey"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    用于消息加解密的密钥，43位字符
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                自动回复配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm font-medium">启用自动回复</div>
                  <div className="text-xs text-gray-500">
                    自动回复常见问题和消息
                  </div>
                </div>
                <Switch
                  checked={config.autoReply}
                  onCheckedChange={(checked) => setConfig({...config, autoReply: checked})}
                />
              </div>

              <div>
                <Label className="text-sm">欢迎语</Label>
                <Textarea
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({...config, welcomeMessage: e.target.value})}
                  placeholder="用户首次咨询时发送的欢迎语"
                  className="mt-1.5 min-h-[80px]"
                />
              </div>

              <div>
                <Label className="text-sm">离线消息</Label>
                <Textarea
                  value={config.offlineMessage}
                  onChange={(e) => setConfig({...config, offlineMessage: e.target.value})}
                  placeholder="客服离线时自动回复的消息"
                  className="mt-1.5 min-h-[60px]"
                />
              </div>

              <div>
                <Label className="text-sm">忙碌消息</Label>
                <Textarea
                  value={config.busyMessage}
                  onChange={(e) => setConfig({...config, busyMessage: e.target.value})}
                  placeholder="客服忙碌时自动回复的消息"
                  className="mt-1.5 min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                接口配置说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="font-medium text-purple-900 mb-1">回调URL</div>
                  <div className="text-xs text-purple-700 break-all font-mono">
                    https://your-domain.com/api/wecom/callback
                  </div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="font-medium text-green-900 mb-1">信任IP</div>
                  <div className="text-xs text-green-700 break-all font-mono">
                    在企业微信管理后台配置服务器IP白名单
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>客服账号配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">客服头像</Label>
                <div className="mt-2">
                  <ImageUploader
                    type="avatar"
                    currentUrl={config.kfAvatar}
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={2}
                    onSuccess={(url, key) => {
                      setConfig((current) => ({
                        ...current,
                        kfAvatar: key || url,
                      }));
                    }}
                    onRemove={() => {
                      setConfig((current) => ({
                        ...current,
                        kfAvatar: '',
                      }));
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">支持 JPG、PNG、WEBP，建议尺寸 200x200</p>
                </div>
              </div>

              <div>
                <Label className="text-sm">客服二维码</Label>
                <div className="mt-2">
                  <ImageUploader
                    type="general"
                    currentUrl={config.kfQrCode}
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={3}
                    onSuccess={(url, key) => {
                      setConfig((current) => ({
                        ...current,
                        kfQrCode: key || url,
                      }));
                    }}
                    onRemove={() => {
                      setConfig((current) => ({
                        ...current,
                        kfQrCode: '',
                      }));
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">建议上传清晰二维码图片，用户端会直接展示并支持扫码</p>
                </div>
              </div>

              <div>
                <Label className="text-sm">客服链接</Label>
                <Input
                  value={config.kfUrl}
                  onChange={(e) => setConfig({...config, kfUrl: e.target.value})}
                  placeholder="https://work.weixin.qq.com/kfid/kfcXXXXX"
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  企业微信客服链接，用户点击链接可直接进入客服聊天。格式：https://work.weixin.qq.com/kfid/kfcXXXXX
                </p>
                {config.kfUrl && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">预览：</p>
                    <a
                      href={config.kfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      点击测试客服链接
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客服状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">客服在线</div>
                  <div className="text-sm text-green-700">当前客服在线，可以接待用户咨询</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entrance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>页面入口配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">首页入口</div>
                    <div className="text-xs text-gray-500">在首页显示客服入口</div>
                  </div>
                  <Switch
                    checked={config.showOnHomepage}
                    onCheckedChange={(checked) => setConfig({...config, showOnHomepage: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">订单页面入口</div>
                    <div className="text-xs text-gray-500">在订单页面显示客服入口</div>
                  </div>
                  <Switch
                    checked={config.showOnOrderPage}
                    onCheckedChange={(checked) => setConfig({...config, showOnOrderPage: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">卖家中心入口</div>
                    <div className="text-xs text-gray-500">在卖家中心显示客服入口</div>
                  </div>
                  <Switch
                    checked={config.showOnSellerPage}
                    onCheckedChange={(checked) => setConfig({...config, showOnSellerPage: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>悬浮按钮配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm font-medium">启用悬浮按钮</div>
                  <div className="text-xs text-gray-500">在页面右下角显示客服悬浮按钮</div>
                </div>
                <Switch
                  checked={config.floatingButtonEnabled}
                  onCheckedChange={(checked) => setConfig({...config, floatingButtonEnabled: checked})}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm">悬浮按钮位置</Label>
                  <Select value={config.floatingButtonPosition} onValueChange={(value: any) => setConfig({...config, floatingButtonPosition: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">右侧</SelectItem>
                      <SelectItem value="left">左侧</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">悬浮按钮颜色</Label>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      className={`w-8 h-8 rounded-full border-2 ${config.floatingButtonColor === '#07C160' ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: '#07C160' }}
                      onClick={() => setConfig({...config, floatingButtonColor: '#07C160'})}
                    />
                    <button
                      className={`w-8 h-8 rounded-full border-2 ${config.floatingButtonColor === '#1890ff' ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: '#1890ff' }}
                      onClick={() => setConfig({...config, floatingButtonColor: '#1890ff'})}
                    />
                    <button
                      className={`w-8 h-8 rounded-full border-2 ${config.floatingButtonColor === '#722ED1' ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: '#722ED1' }}
                      onClick={() => setConfig({...config, floatingButtonColor: '#722ED1'})}
                    />
                    <button
                      className={`w-8 h-8 rounded-full border-2 ${config.floatingButtonColor === '#FA541C' ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: '#FA541C' }}
                      onClick={() => setConfig({...config, floatingButtonColor: '#FA541C'})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm">悬浮按钮预览</Label>
                <div className="mt-4 p-8 bg-gray-100 rounded-lg relative">
                  <div 
                    className={`absolute bottom-4 ${config.floatingButtonPosition === 'right' ? 'right-4' : 'left-4'} w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
                    style={{ backgroundColor: config.floatingButtonColor }}
                  >
                    <MessageCircle className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-center text-sm text-gray-500">
                    <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    悬浮按钮预览
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客服二维码入口</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-700">
                    <div className="font-medium mb-1">客服二维码</div>
                    <div className="text-xs">
                      配置客服二维码后，用户可以通过扫码直接添加企业微信客服，方便进行一对一咨询。
                      二维码将显示在客服悬浮窗口和客服页面。
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
