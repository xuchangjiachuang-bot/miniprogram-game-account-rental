'use client';

import { useEffect, useState } from 'react';
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
import { LayoutDashboard, LogOut, Settings, User } from 'lucide-react';

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
}

export function AdminHeader({
  title,
  showDashboard = true,
  showAdminUsers = false,
}: AdminHeaderProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch('/api/admin/auth/me', {
          credentials: 'include',
        });
        const result = await response.json();

        if (result.success) {
          setAdmin(result.data);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('获取管理员信息失败:', error);
      }
    };

    fetchAdminInfo();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('退出失败:', error);
    } finally {
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

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {admin ? (
              <>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-indigo-600 text-lg font-semibold text-white">
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

          {admin ? (
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
                {showDashboard ? (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>控制台</span>
                  </DropdownMenuItem>
                ) : null}
                {showAdminUsers ? (
                  <DropdownMenuItem onClick={() => router.push('/admin/admin-users')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>管理员账号</span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>配置中心</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
