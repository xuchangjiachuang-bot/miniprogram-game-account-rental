'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Wallet, ShoppingBag, LogOut, Menu, MessageSquare, Bell, X, Package } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { LoginDialog } from '@/components/LoginDialog';
import { LogoConfig } from '@/lib/config-types';
import { useRouter } from 'next/navigation';
import { loadLogoFromCache, saveConfigToCache, loadConfigFromCache } from '@/lib/config-sync';
import { useConfigUpdate } from '@/lib/config-sync-manager';
import { getToken } from '@/lib/auth-token';

// 默认 Logo 配置（作为 fallback）
const DEFAULT_LOGO: LogoConfig = {
  id: 'default',
  name: '默认Logo',
  type: 'text',
  text: '哈夫币租赁平台',
  textStyle: {
    fontSize: 'xl',
    fontWeight: 'bold'
  },
  linkUrl: '/',
  enabled: true
};

export function Header() {
  const { user, loading, logout, refreshUser } = useUser();
  const [logos, setLogos] = useState<LogoConfig[]>([DEFAULT_LOGO]); // 初始化时设置默认 logo
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false); // 标记 logo 是否已加载
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  // 加载 Logo 配置（优先从 localStorage 读取）
  useEffect(() => {
    // 1. 优先从 localStorage 读取（同步执行，避免闪烁）
    try {
      const cachedConfig = loadConfigFromCache<any>();
      if (cachedConfig?.logos) {
        const enabledLogos = cachedConfig.logos.filter((l: LogoConfig) => l.enabled);
        if (enabledLogos.length > 0) {
          setLogos(enabledLogos);
          setLogoLoaded(true);
        }
      }
    } catch (e) {
      console.error('读取缓存的LOGO失败:', e);
    }

    // 2. 异步从后台加载最新配置（延迟执行，避免阻塞首次渲染）
    const loadTimer = setTimeout(() => {
      loadLogos();
    }, 100);

    return () => clearTimeout(loadTimer);
  }, []);

  // 加载未读通知数量和监听SSE
  useEffect(() => {
    if (!user?.id) return;

    // 加载未读通知数量
    loadUnreadCount();

    // SSE 重连配置
    const maxRetries = 5;
    const retryDelay = 3000; // 3秒重试
    let retryCount = 0;

    // 建立SSE连接监听实时通知
    const connectSSE = () => {
      try {
        const eventSource = new EventSource('/api/notifications/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE连接已建立');
          retryCount = 0; // 重置重试计数
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'connected') {
              console.log('SSE已连接到服务器');
              return;
            }

            if (data.type === 'notification' && data.userId === user.id) {
              // 收到新通知
              console.log('收到新通知:', data);

              // 更新未读数量
              setUnreadCount(data.unreadCount);

              // 刷新通知列表
              loadNotifications();
            }
          } catch (error) {
            console.error('解析SSE消息失败:', error);
          }
        };

        eventSource.onerror = (error) => {
          // SSE连接错误是正常的（比如网络断开重连），只在重连失败时记录
          if (retryCount >= maxRetries) {
            console.error('SSE连接失败，已达到最大重试次数');
          } else {
            console.log(`SSE连接中断，准备重连... (${retryCount + 1}/${maxRetries})`);
          }
          eventSource.close();

          // 自动重连
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(connectSSE, retryDelay);
          }
        };
      } catch (error) {
        console.error('创建SSE连接失败:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connectSSE, retryDelay);
        }
      }
    };

    // 开始连接
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user?.id]);

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/notifications/unread-count?userId=${user.id}`);
      const result = await res.json();
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('加载未读通知数量失败:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setNotificationsLoading(true);
      const token = getToken();
      const res = await fetch('/api/notifications/list?limit=20&offset=0', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.success) {
        const list = Array.isArray(result.notifications)
          ? result.notifications
          : Array.isArray(result.data)
            ? result.data
            : [];
        const unreadOnly = list.filter((item: any) => !(item.isRead ?? item.is_read));
        setNotifications(unreadOnly);
      }
    } catch (error) {
      console.error('加载通知列表失败:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      const result = await res.json();
      if (result.success) {
        // 刷新通知列表和未读数量
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('标记通知为已读失败:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      // 获取 token
      const token = getToken();

      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await res.json();
      if (result.success) {
        // 刷新通知列表和未读数量
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
    }
  };

  // 监听配置更新（通过 SSE）
  useConfigUpdate('all', (event) => {
    console.log('Header 收到配置更新:', event);
    loadLogos();
  }, []);

  const loadLogos = async () => {
    try {
      const res = await fetch('/api/homepage-config', {
        cache: 'no-store'
      });
      const result = await res.json();
      if (result.success && result.data?.logos) {
        const enabledLogos = result.data.logos.filter((l: LogoConfig) => l.enabled);

        if (enabledLogos.length > 0) {
          // 保存到 localStorage（保存完整配置）
          try {
            const cachedConfig = loadConfigFromCache<any>() || {};
            const newConfig = {
              ...cachedConfig,
              logos: result.data.logos,
              ...result.data,
            };
            saveConfigToCache(newConfig);
          } catch (e) {
            console.error('保存LOGO到缓存失败:', e);
          }

          setLogos(enabledLogos);
          setLogoLoaded(true);
        }
      }
    } catch (error) {
      console.error('加载LOGO失败:', error);
      // 加载失败时保持当前 logo（可能是缓存的或默认的）
    }
  };

  const handleLogout = async () => {
    await logout();
  };


  const handleLoginSuccess = async () => {
    setShowLoginDialog(false);
    // 登录成功后刷新用户状态，不跳转
    await refreshUser();
  };

  // 获取主 Logo
  const mainLogo = logos[0] || DEFAULT_LOGO; // 直接使用第一个，因为已经是过滤后的

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-full">
          {/* Logo - 左侧 */}
          <div className="flex justify-start">
            <Link href="/" className="flex items-center space-x-2">
              {mainLogo.type === 'text' && mainLogo.text ? (
                <div
                  className="font-bold transition-all duration-200"
                  style={{
                    fontSize: mainLogo.textStyle?.fontSize === '3xl' ? '1.875rem' :
                             mainLogo.textStyle?.fontSize === '2xl' ? '1.5rem' :
                             mainLogo.textStyle?.fontSize === 'xl' ? '1.25rem' :
                             mainLogo.textStyle?.fontSize === 'lg' ? '1.125rem' :
                             mainLogo.textStyle?.fontSize === 'md' ? '1rem' :
                             mainLogo.textStyle?.fontSize === 'sm' ? '0.875rem' :
                             mainLogo.textStyle?.fontSize === 'xs' ? '0.75rem' : '1.25rem',
                    fontWeight: mainLogo.textStyle?.fontWeight === 'semibold' ? '600' :
                              mainLogo.textStyle?.fontWeight === 'bold' ? '700' :
                              mainLogo.textStyle?.fontWeight === 'normal' ? '400' : '700',
                    backgroundImage: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {mainLogo.text}
                </div>
              ) : mainLogo.type === 'image' && mainLogo.imageUrl ? (
                <div className="h-10 w-auto relative">
                  <Image
                    src={mainLogo.imageUrl}
                    alt={mainLogo.name || 'Logo'}
                    width={160}
                    height={40}
                    className="h-10 w-auto object-contain"
                    priority={logoLoaded} // 首次加载时启用优先加载
                    sizes="160px"
                  />
                </div>
              ) : null}
            </Link>
          </div>

          {/* 导航链接 - 居中 */}
          <nav className="flex items-center justify-center">
            {/* 导航栏留空，删除了首页链接 */}
          </nav>

          {/* 用户区域 - 右侧 */}
          <div className="flex justify-end items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <>
                {/* 通知图标 */}
                <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
                      onClick={handleNotificationClick}
                    >
                      <Bell className="h-5 w-5 text-gray-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs p-0 rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end" forceMount>
                    <DropdownMenuLabel className="flex justify-between items-center">
                      <span>通知</span>
                      {notifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-purple-600 hover:text-purple-700"
                          onClick={handleMarkAllAsRead}
                        >
                          全部已读
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notificationsLoading ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        正在加载通知...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        暂无通知
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                            onClick={() => {
                              handleMarkAsRead(notification.id);
                              // 如果通知有关联订单，跳转到订单详情页
                              if (notification.orderId) {
                                router.push(`/orders/${notification.orderId}`);
                              }
                              setShowNotifications(false);
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium text-gray-900 flex-1">
                                {notification.title}
                              </p>
                              <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {notification.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {notifications.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/user-center?tab=notifications" className="cursor-pointer text-center py-2 text-sm text-purple-600 hover:text-purple-700">
                            查看全部通知
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 用户头像下拉菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full group hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-200"
                    >
                      <Avatar className="h-10 w-10 transition-transform duration-200 group-hover:scale-105">
                        <AvatarImage src={user.avatar ?? undefined} alt={user.username} />
                        <AvatarFallback>{user.username?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.phone}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/user-center" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      个人中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/seller/accounts" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      我的账号
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user-center?tab=chats" className="cursor-pointer relative">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      群聊
                      {unreadCount > 0 && (
                        <Badge className="ml-auto h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs p-0 rounded-full">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user-center?tab=orders" className="cursor-pointer">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      我的订单
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user-center?tab=wallet" className="cursor-pointer">
                      <Wallet className="mr-2 h-4 w-4" />
                      我的钱包
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowLoginDialog(true)}
                className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-medium"
              >
                登录
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 登录对话框 */}
      <LoginDialog
        trigger={null}
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onSuccess={handleLoginSuccess}
      />
    </header>
  );
}
