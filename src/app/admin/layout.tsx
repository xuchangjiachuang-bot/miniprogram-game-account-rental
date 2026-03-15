'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Check,
  GripVertical,
  Headset,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquareText,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
  X,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const defaultMenuItems = [
  { id: 'dashboard', title: '仪表盘', href: '/admin', icon: LayoutDashboard },
  { id: 'accounts', title: '账号审核', href: '/admin/accounts', icon: ShieldCheck },
  { id: 'verification-requests', title: '实名审核', href: '/admin/verification-requests', icon: Check },
  { id: 'orders', title: '订单管理', href: '/admin/orders', icon: ShoppingCart },
  { id: 'chat-logs', title: '聊天记录', href: '/admin/chat-logs', icon: MessageSquare },
  { id: 'users', title: '用户管理', href: '/admin/users', icon: Users },
  { id: 'wecom-customer-service', title: '企业微信', href: '/admin/wecom-customer-service', icon: Headset },
  { id: 'sms', title: '短信服务', href: '/admin/sms', icon: MessageSquareText },
  { id: 'withdrawals', title: '提现审核', href: '/admin/withdrawals', icon: Wallet },
  { id: 'homepage', title: '首页配置', href: '/admin/homepage', icon: LayoutDashboard },
  { id: 'skins', title: '皮肤管理', href: '/admin/skins', icon: LayoutDashboard },
  { id: 'commission-activities', title: '优惠活动', href: '/admin/commission-activities', icon: RefreshCw },
  { id: 'settings', title: '配置中心', href: '/admin/settings', icon: Settings },
  { id: 'search-content', title: '\u5185\u5bb9\u4e0e\u641c\u7d22', href: '/admin/search-content', icon: Search },
] as const;

type MenuItem = (typeof defaultMenuItems)[number];

type AdminInfo = {
  id: string;
  username: string;
  name: string;
  role: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hasCheckedRef = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOrder, setMenuOrder] = useState<{ id: string; title?: string }[]>([]);
  const [isSortingMode, setIsSortingMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [editingMenuItems, setEditingMenuItems] = useState<MenuItem[]>([...defaultMenuItems]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/api/admin/auth/me', {
          credentials: 'include',
        });
        const result = await response.json();

        if (result.success) {
          setIsAuthenticated(true);
          setAdmin(result.data);
          return;
        }
      } catch (error) {
        console.error('检查后台登录状态失败:', error);
      } finally {
        setIsLoading(false);
      }

      window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
    };

    void checkLoginStatus();
  }, [pathname]);

  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('admin_menu_order');
      if (savedOrder) {
        setMenuOrder(JSON.parse(savedOrder));
      }
    } catch (error) {
      console.error('加载后台菜单排序失败:', error);
    }
  }, []);

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

  const enterSortingMode = () => {
    setEditingMenuItems([...sortedMenuItems]);
    setIsSortingMode(true);
  };

  const exitSortingMode = () => {
    setIsSortingMode(false);
    setEditingMenuItems([...sortedMenuItems]);
    setDraggedItem(null);
  };

  const saveOrder = () => {
    const nextOrder = editingMenuItems.map((item) => ({ id: item.id, title: item.title }));
    localStorage.setItem('admin_menu_order', JSON.stringify(nextOrder));
    setMenuOrder(nextOrder);
    setIsSortingMode(false);
    setDraggedItem(null);
    toast.success('后台菜单顺序已保存');
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedItem === null || draggedItem === index) return;

    const nextItems = [...editingMenuItems];
    const [removed] = nextItems.splice(draggedItem, 1);
    nextItems.splice(index, 0, removed);
    setEditingMenuItems(nextItems);
    setDraggedItem(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const nextItems = [...editingMenuItems];
    [nextItems[index - 1], nextItems[index]] = [nextItems[index], nextItems[index - 1]];
    setEditingMenuItems(nextItems);
  };

  const moveDown = (index: number) => {
    if (index >= editingMenuItems.length - 1) return;
    const nextItems = [...editingMenuItems];
    [nextItems[index + 1], nextItems[index]] = [nextItems[index], nextItems[index + 1]];
    setEditingMenuItems(nextItems);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'superadmin') return '超级管理员';
    if (role === 'admin') return '管理员';
    return '未知角色';
  };

  const refreshAdminInfo = async () => {
    const response = await fetch('/api/admin/auth/me', {
      credentials: 'include',
    });
    const result = await response.json();
    if (result.success) {
      setAdmin(result.data);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('后台退出登录失败:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  const openEditAccountDialog = () => {
    if (!admin) return;
    setEditFormData({
      username: admin.username,
      currentPassword: '',
      newPassword: '',
    });
    setEditAccountDialogOpen(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.currentPassword) {
      toast.error('请输入当前密码');
      return;
    }

    setIsUpdating(true);
    try {
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

      await refreshAdminInfo();
      setEditAccountDialogOpen(false);
      toast.success('后台账号信息已更新');
    } catch (error) {
      console.error('更新后台账号信息失败:', error);
      toast.error('更新后台账号信息失败');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
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

        <div className="border-b bg-gray-50 px-4 py-3">
          {isSortingMode ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveOrder} className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="mr-1 h-4 w-4" />
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={exitSortingMode} className="flex-1">
                <XIcon className="mr-1 h-4 w-4" />
                取消
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={enterSortingMode} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              排序菜单
            </Button>
          )}
        </div>

        <nav className="space-y-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {(isSortingMode ? editingMenuItems : sortedMenuItems).map((item, index) => {
            const Icon = item.icon;
            const isActive = !isSortingMode && pathname === item.href;

            if (isSortingMode) {
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="flex cursor-move items-center gap-3 rounded-lg border bg-white p-3 transition-colors hover:border-purple-300 hover:bg-purple-50"
                >
                  <GripVertical className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div className="rounded-lg bg-purple-50 p-1.5">
                    <Icon className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{item.title}</span>
                  <div className="flex gap-1">
                    {index > 0 ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(index)}>
                        <RefreshCw className="h-3 w-3 rotate-90" />
                      </Button>
                    ) : null}
                    {index < editingMenuItems.length - 1 ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(index)}>
                        <RefreshCw className="h-3 w-3 -rotate-90" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <Button
            onClick={handleLogout}
            className="w-full justify-start gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            variant="ghost"
          >
            <LogOut className="h-5 w-5" />
            退出管理后台
          </Button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 border-b bg-white">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="ml-auto flex items-center gap-4">
              {admin ? (
                <>
                  <div className="hidden text-sm text-gray-600 sm:block">欢迎回来，{admin.name}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar>
                          <AvatarFallback className="bg-indigo-600 font-semibold text-white">
                            {getInitials(admin.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{admin.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{admin.username}</p>
                          <p className="text-xs leading-none text-muted-foreground">{getRoleLabel(admin.role)}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={openEditAccountDialog}>
                        <Key className="mr-2 h-4 w-4" />
                        <span>修改账号信息</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>配置中心</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>退出登录</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>

      <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改账号信息</DialogTitle>
            <DialogDescription>修改后台登录用户名和密码。</DialogDescription>
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
                <Label htmlFor="currentPassword">当前密码</Label>
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
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                  placeholder="留空则不修改密码"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditAccountDialogOpen(false)}>
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
