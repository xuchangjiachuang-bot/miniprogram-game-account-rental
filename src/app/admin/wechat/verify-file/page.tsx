'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Check, AlertCircle, RefreshCw, ExternalLink, Copy } from 'lucide-react';

interface VerifyFileStatus {
  exists: boolean;
  filename?: string;
  url?: string;
  content?: string;
}

export default function WechatVerifyFileManager() {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<VerifyFileStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 检查验证文件状态
  const checkStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/wechat/domain-verify-file');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        setStatus({ exists: false });
      }
    } catch (err) {
      setError('检查验证文件状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传验证文件
  const handleUpload = async () => {
    if (!filename || !content) {
      setError('请填写文件名和内容');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/wechat/domain-verify-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('验证文件上传成功！');
        setStatus(data.data);
        setFilename('');
        setContent('');
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError('上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  // 复制URL到剪贴板
  const copyUrl = () => {
    if (status?.url) {
      navigator.clipboard.writeText(status.url);
      setSuccess('URL已复制到剪贴板！');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 页面加载时检查状态
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            验证文件状态
          </CardTitle>
          <CardDescription>检查微信域名验证文件是否已上传</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.exists ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">验证文件已上传</p>
                  <p className="text-sm text-green-700 mt-1">
                    文件名：{status.filename}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>验证文件URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={status.url || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={status.url || ''} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  将此URL复制到公众号后台进行域名验证
                </p>
              </div>

              <Button onClick={checkStatus} variant="outline" className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新状态
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">验证文件未上传</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    请在下方上传微信域名验证文件
                  </p>
                </div>
              </div>
              <Button onClick={checkStatus} variant="outline" className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                检查状态
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上传表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传验证文件
          </CardTitle>
          <CardDescription>上传微信公众平台提供的域名验证文件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filename">文件名</Label>
            <Input
              id="filename"
              placeholder="例如：MP_verify_abc123.txt"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              文件名格式应为 MP_verify_xxxxxx.txt
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">文件内容</Label>
            <textarea
              id="content"
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="粘贴验证文件内容（通常是16位字符串）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              从微信公众平台下载的验证文件内容
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !filename || !content}
            className="w-full"
          >
            <Upload className={`h-4 w-4 mr-2 ${uploading ? 'animate-pulse' : ''}`} />
            {uploading ? '上传中...' : '上传验证文件'}
          </Button>
        </CardContent>
      </Card>

      {/* 操作指南 */}
      <Card>
        <CardHeader>
          <CardTitle>操作指南</CardTitle>
          <CardDescription>如何获取和配置微信域名验证文件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <p className="font-medium">登录微信公众平台</p>
              <p className="text-gray-600 ml-4">访问 https://mp.weixin.qq.com/</p>
            </li>
            <li>
              <p className="font-medium">进入功能设置</p>
              <p className="text-gray-600 ml-4">点击左侧菜单 "功能设置" → "网页授权域名"</p>
            </li>
            <li>
              <p className="font-medium">设置域名</p>
              <p className="text-gray-600 ml-4">
                输入域名：<code className="bg-gray-100 px-1 rounded">hfb.yugioh.top</code>
              </p>
            </li>
            <li>
              <p className="font-medium">下载验证文件</p>
              <p className="text-gray-600 ml-4">点击"下载验证文件"，保存 .txt 文件</p>
            </li>
            <li>
              <p className="font-medium">上传验证文件</p>
              <p className="text-gray-600 ml-4">
                打开验证文件，复制文件名和内容到本页面上传
              </p>
            </li>
            <li>
              <p className="font-medium">验证域名</p>
              <p className="text-gray-600 ml-4">
                复制上方的URL到公众号后台进行验证
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* 错误和成功提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
