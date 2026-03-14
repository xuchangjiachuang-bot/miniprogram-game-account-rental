'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, ShoppingCart, Users, Settings, LogOut, Menu, X, MessageSquare, Headset, MessageSquareText, CreditCard, Wallet, RefreshCw, Building, GripVertical, Check, X as XIcon, AlertCircle, Lock, User, Key, Shield, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

// 默认菜单配置
const defaultMenuItems = [
  {
    id: 'dashboard',
    title: '仪表盘',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    id: 'accounts',
    title: '账号审核',
    href: '/admin/accounts',
    icon: ShieldCheck
  },
  {
    id: 'verification-requests',
    title: '实名审核',
    href: '/admin/verification-requests',
    icon: Check
  },
  {
    id: 'orders',
    title: '订单管理',
    href: '/admin/orders',
    icon: ShoppingCart
  },
  {
    id: 'refunds',
    title: '售后审核',
    href: '/admin/refunds',
    icon: AlertCircle
  },
  {
    id: 'chat-logs',
    title: '聊天记录',
    href: '/admin/chat-logs',
    icon: MessageSquare
  },
  {
    id: 'users',
    title: '用户管理',
    href: '/admin/users',
    icon: Users
  },
  {
    id: 'wecom-customer-service',
    title: '企业微信',
    href: '/admin/wecom-customer-service',
    icon: Headset
  },
  {
    id: 'sms',
    title: '短信服务',
    href: '/admin/sms',
    icon: MessageSquareText
  },
  {
    id: 'payments',
    title: '支付管理',
    href: '/admin/payments',
    icon: CreditCard
  },
  {
    id: 'withdrawals',
    title: '提现分账',
    href: '/admin/withdrawals',
    icon: Wallet
  },
  {
    id: 'homepage',
    title: '首页配置',
    href: '/admin/homepage',
    icon: LayoutDashboard
  },
  {
    id: 'skins',
    title: '皮肤管理',
    href: '/admin/skins',
    icon: LayoutDashboard
  },
  {
    id: 'commission-activities',
    title: '优惠活动',
    href: '/admin/commission-activities',
    icon: RefreshCw
  },
  {
    id: 'settings',
    title: '配置中心',
    href: '/admin/settings',
    icon: Settings
  }
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOrder, setMenuOrder] = useState<{ id: string; title?: string }[]>([]);
  const [isSortingMode, setIsSortingMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [editingMenuItems, setEditingMenuItems] = useState<typeof defaultMenuItems>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<{ id: string; username: string; name: string; role: string } | null>(null);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [wechatConfigOpen, setWechatConfigOpen] = useState(false);
  const [config, setConfig] = useState({
    wechatToken: '',
    wechatEncodingAESKey: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const hasCheckedRef = useRef(false);

  // 检查登录状态
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/api/admin/auth/me', {
          credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
          setIsAuthenticated(true);
          setAdmin(result.data);
        } else {
          window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
        }
      } catch (error) {
        window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, [pathname]);
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('admin_menu_order');
      if (savedOrder) {
        setMenuOrder(JSON.parse(savedOrder));
      }
    } catch (error) {
      console.error('加载菜单排序失败:', error);
    }
  }, []);

  // 根据排序后的菜单项生成菜单
  const sortedMenuItems = useMemo(() => {
    if (menuOrder.length === 0) {
      return defaultMenuItems;
    }
    const orderMap = new Map(menuOrder.map((item, index) => [item.id, index]));
    return [...defaultMenuItems].sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? 999;
      const bIndex = orderMap.get(b.id) ?? 999;
      return aIndex - bIndex;
    });
  }, [menuOrder]);

  // 进入排序模式
  const enterSortingMode = () => {
    setEditingMenuItems([...sortedMenuItems]);
    setIsSortingMode(true);
  };

  // 退出排序模式
  const exitSortingMode = () => {
    setIsSortingMode(false);
    setEditingMenuItems([]);
    setDraggedItem(null);
  };

  // 保存排序
  const saveOrder = () => {
    const order = editingMenuItems.map(item => ({ id: item.id, title: item.title }));
    localStorage.setItem('admin_menu_order', JSON.stringify(order));
    setMenuOrder(order);
    setIsSortingMode(false);
    setEditingMenuItems([]);
    setDraggedItem(null);
    alert('菜单顺序已保存');
  };

  // 拖拽处理
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedItem !== null && draggedItem !== index) {
      const newItems = [...editingMenuItems];
      const [removed] = newItems.splice(draggedItem, 1);
      newItems.splice(index, 0, removed);
      setEditingMenuItems(newItems);
      setDraggedItem(null);
    }
  };

  // 上移菜单项
  const moveUp = (index: number) => {
    if (index > 0) {
      const newItems = [...editingMenuItems];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      setEditingMenuItems(newItems);
    }
  };

  // 下移菜单项
  const moveDown = (index: number) => {
    if (index < editingMenuItems.length - 1) {
      const newItems = [...editingMenuItems];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      setEditingMenuItems(newItems);
    }
  };

  // 获取头像首字母
  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const names = name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // 获取角色标签
  const getRoleLabel = (role?: string) => {
    if (role === 'superadmin') return '超级管理员';
    if (role === 'admin') return '管理员';
    return '未知';
  };

  // 登出
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('登出失败:', error);
      router.push('/admin/login');
    }
  };

  // 打开修改账户弹窗
  const openEditAccountDialog = () => {
    if (admin) {
      setEditFormData({
        username: admin.username,
        currentPassword: '',
        newPassword: '',
      });
      setEditAccountDialogOpen(true);
    }
  };

  // 修改账户信息
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.currentPassword) {
      toast.error('请输入当前密码');
      return;
    }

    setIsUpdating(true);
    try {
      // 如果要修改用户名
      if (editFormData.username !== admin?.username) {
        const response = await fetch('/api/admin/auth/update-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            currentPassword: editFormData.currentPassword,
            newUsername: editFormData.username,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          toast.error(result.error || '修改用户名失败');
          return;
        }
      }

      // 如果要修改密码
      if (editFormData.newPassword) {
        const response = await fetch('/api/admin/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            currentPassword: editFormData.currentPassword,
            newPassword: editFormData.newPassword,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          toast.error(result.error || '修改密码失败');
          return;
        }
      }

      toast.success('账户信息修改成功');
      setEditAccountDialogOpen(false);

      // 重新获取管理员信息
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setAdmin(result.data);
      }
    } catch (error) {
      console.error('修改账户信息失败:', error);
      toast.error('修改账户信息失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 微信配置相关函数
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 显示加载界面（检查登录状态或未认证）
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            管理后台
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 排序控制按钮 */}
        <div className="px-4 py-3 border-b bg-gray-50">
          {isSortingMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveOrder}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-1" />
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exitSortingMode}
                className="flex-1"
              >
                <XIcon className="h-4 w-4 mr-1" />
                取消
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={enterSortingMode}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              排序菜单
            </Button>
          )}
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {(isSortingMode ? editingMenuItems : sortedMenuItems).map((item, index) => {
            const isActive = !isSortingMode && pathname === item.href;
            const Icon = item.icon;
            
            if (isSortingMode) {
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="p-1.5 bg-purple-50 rounded-lg flex-shrink-0">
                    <Icon className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium flex-1">{item.title}</span>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveUp(index)}
                      >
                        <RefreshCw className="h-3 w-3 rotate-90" />
                      </Button>
                    )}
                    {index < editingMenuItems.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveDown(index)}
                      >
                        <RefreshCw className="h-3 w-3 -rotate-90" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button
            onClick={async () => {
              try {
                await fetch('/api/admin/auth/logout', {
                  method: 'DELETE',
                  credentials: 'include'
                });
                router.push('/admin/login');
              } catch (error) {
                console.error('登出失败:', error);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors justify-start"
            variant="ghost"
          >
            <LogOut className="h-5 w-5" />
            退出管理
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="lg:ml-64">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4 ml-auto">
              {admin && (
                <>
                  <div className="text-sm text-gray-600 hidden sm:block">
                    欢迎回来，{admin.name}
                  </div>
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
                      <DropdownMenuItem onClick={openEditAccountDialog}>
                        <Key className="mr-2 h-4 w-4" />
                        <span>修改账户信息</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>配置中心</span>
                      </DropdownMenuItem>
                      {false && (
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
                                '保存配置'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>退出登录</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* 修改账户信息弹窗 */}
      <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改账户信息</DialogTitle>
            <DialogDescription>
              修改您的用户名和密码
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAccount}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  placeholder="请输入新用户名"
                />
              </div>
              <div>
                <Label htmlFor="currentPassword">当前密码 *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={editFormData.currentPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, currentPassword: e.target.value })}
                  placeholder="请输入当前密码"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">新密码（留空则不修改）</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                  placeholder="请输入新密码（至少6位）"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditAccountDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
