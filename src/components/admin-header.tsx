'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, AlertCircle, Info, X } from 'lucide-react';
import { User, Settings, LogOut, Shield, LayoutDashboard, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: 'superadmin' | 'admin';
  email?: string;
}

interface AdminHeaderProps {
  title: string;
  showDashboard?: boolean;
  showAdminUsers?: boolean;
  showWechatConfig?: boolean;
  showWechatStatus?: boolean;
}

export function AdminHeader({
  title,
  showDashboard = true,
  showAdminUsers = false,
  showWechatConfig = false,
  showWechatStatus = false,
}: AdminHeaderProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [wechatConfigOpen, setWechatConfigOpen] = useState(false);
  const [config, setConfig] = useState({
    wechatToken: '',
    wechatEncodingAESKey: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    fetchAdminInfo();
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include', // 确保浏览器发送 Cookie
      });

      const result = await response.json();

      if (result.success) {
        setAdmin(result.data);
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        }
      }
    } catch (error) {
      console.error('获取管理员信息失败:', error);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/wechat/config', {
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setConfig({
          wechatToken: result.data.wechatToken || '',
          wechatEncodingAESKey: result.data.wechatEncodingAESKey || '',
        });
      }
    } catch (error) {
      console.error('获取配置失败:', error);
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
        credentials: 'include',
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('配置保存成功');
        setWechatConfigOpen(false);
      } else {
        toast.error(result.error || '保存配置失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleWechatConfigOpen = (open: boolean) => {
    setWechatConfigOpen(open);
    if (open) {
      fetchConfig();
      if (typeof window !== 'undefined') {
        setServerUrl(`${window.location.origin}/api/wechat/server-verify`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include', // 确保浏览器发送 Cookie
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('登出失败:', error);
      router.push('/admin/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const names = name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'superadmin') return '超级管理员';
    if (role === 'admin') return '管理员';
    return '未知';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {admin ? (
              <>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-indigo-600 text-white font-semibold text-lg">
                    {getInitials(admin.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-gray-500">欢迎回来</p>
                  <h1 className="text-2xl font-bold text-gray-900">{admin.name}</h1>
                </div>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarFallback className="bg-indigo-600 text-white font-semibold">
                        {getInitials(admin.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{admin.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {admin.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getRoleLabel(admin.role)}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {showDashboard && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>控制台</span>
                    </DropdownMenuItem>
                  )}
                  {showAdminUsers && (
                    <DropdownMenuItem onClick={() => router.push('/admin/admin-users')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>管理员账号</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>配置中心</span>
                  </DropdownMenuItem>
                  {false && showWechatConfig && (
                    <Dialog open={wechatConfigOpen} onOpenChange={handleWechatConfigOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Shield className="mr-2 h-4 w-4" />
                          <span>微信服务器配置</span>
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>微信开放平台服务器配置</DialogTitle>
                          <DialogDescription>
                            配置微信开放平台的消息推送服务器
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                          {/* 服务器地址 */}
                          <div className="space-y-2">
                            <Label htmlFor="serverUrl">服务器地址 (URL)</Label>
                            <div className="flex gap-2">
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
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800 text-xs">
                                <strong>注意：</strong>当前显示的是当前页面的地址。如果显示的是 localhost，请手动替换为您的公网域名。
                                <br />
                                示例：https://yourdomain.com/api/wechat/server-verify
                              </AlertDescription>
                            </Alert>
                          </div>

                          {/* Token */}
                          <div className="space-y-2">
                            <Label htmlFor="wechatToken">令牌 (Token)</Label>
                            <Input
                              id="wechatToken"
                              value={config.wechatToken}
                              onChange={(e) => setConfig({ ...config, wechatToken: e.target.value })}
                              placeholder="请输入自定义Token（3-32字符）"
                            />
                            <p className="text-sm text-gray-500">
                              自定义Token，长度为3-32字符，只能包含字母和数字
                            </p>
                          </div>

                          {/* EncodingAESKey */}
                          <div className="space-y-2">
                            <Label htmlFor="encodingAESKey">消息加解密密钥 (EncodingAESKey)</Label>
                            <Input
                              id="encodingAESKey"
                              value={config.wechatEncodingAESKey}
                              onChange={(e) => setConfig({ ...config, wechatEncodingAESKey: e.target.value })}
                              placeholder="请输入随机字符串（43字符）"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
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
                              >
                                复制
                              </Button>
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="mt-6">
                          <Button
                            variant="outline"
                            onClick={() => setWechatConfigOpen(false)}
                          >
                            取消
                          </Button>
                          <Button
                            onClick={saveConfig}
                            disabled={saveLoading}
                          >
                            {saveLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                保存中...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                保存配置
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {false && showWechatStatus && (
                    <DropdownMenuItem onClick={() => router.push('/admin/wechat-status')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>微信配置状态</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
