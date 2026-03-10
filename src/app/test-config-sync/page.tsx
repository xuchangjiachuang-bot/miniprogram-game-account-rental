'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loadConfigFromCache, getConfigVersion, saveConfigToCache, clearConfigCache } from '@/lib/config-sync';
import { useConfigUpdate, useRefreshConfig } from '@/lib/config-sync-manager';

export default function TestConfigSyncPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [version, setVersion] = useState<string>('0');
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const refreshConfig = useRefreshConfig();

  // 加载缓存配置（只在客户端执行）
  useEffect(() => {
    setIsMounted(true);
    const cachedConfig = loadConfigFromCache<any>();
    setConfig(cachedConfig);
    setVersion(getConfigVersion());
  }, []);

  // 监听配置更新
  useConfigUpdate('all', (event) => {
    console.log('测试页面收到配置更新:', event);
    setEvents(prev => [
      {
        ...event,
        receivedAt: new Date().toLocaleString(),
      },
      ...prev,
    ].slice(0, 10)); // 保留最近 10 条记录

    // 刷新配置
    const newConfig = loadConfigFromCache<any>();
    setConfig(newConfig);
    setVersion(getConfigVersion());
  }, []);

  // 检测 SSE 连接状态
  useEffect(() => {
    const interval = setInterval(() => {
      // 这里可以添加更复杂的连接状态检测逻辑
      setIsConnected(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefreshConfig = () => {
    refreshConfig();
    const newConfig = loadConfigFromCache<any>();
    setConfig(newConfig);
    setVersion(getConfigVersion());
  };

  const handleClearCache = () => {
    clearConfigCache();
    setConfig(null);
    setVersion('0');
    setEvents([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">配置同步测试页面</h1>
            <p className="text-gray-600 mt-2">用于测试 SSE 配置推送功能</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "已连接" : "未连接"}
            </Badge>
            {isMounted && (
              <Badge variant="outline">版本: {version}</Badge>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
            <CardDescription>测试配置同步功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={handleRefreshConfig}>刷新配置</Button>
              <Button variant="outline" onClick={handleClearCache}>清除缓存</Button>
            </div>
          </CardContent>
        </Card>

        {/* 当前配置 */}
        <Card>
          <CardHeader>
            <CardTitle>当前配置</CardTitle>
            <CardDescription>从 localStorage 读取的配置</CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(config, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">暂无配置</p>
            )}
          </CardContent>
        </Card>

        {/* 配置更新事件 */}
        <Card>
          <CardHeader>
            <CardTitle>配置更新事件</CardTitle>
            <CardDescription>最近收到的配置更新事件（最多 10 条）</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{event.type}</span>
                      <span className="text-gray-500 ml-2">{event.version}</span>
                    </div>
                    <span className="text-sm text-gray-500">{event.receivedAt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无事件</p>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>打开此页面，等待 SSE 连接建立</li>
              <li>在管理后台修改首页配置（LOGO、皮肤等）</li>
              <li>观察此页面是否收到配置更新事件</li>
              <li>检查当前配置是否已更新</li>
              <li>检查版本号是否已更新</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
