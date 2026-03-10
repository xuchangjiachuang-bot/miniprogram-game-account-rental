'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;

      // 如果已经在登录页面，不需要检查
      if (pathname?.startsWith('/admin/login')) {
        return;
      }

      console.log('[AdminAuthGuard] 检查登录状态');
      try {
        const response = await fetch('/api/admin/auth/me', {
          credentials: 'include'
        });
        const result = await response.json();
        console.log('[AdminAuthGuard] 登录状态:', result.success);

        if (!result.success) {
          console.log('[AdminAuthGuard] 未登录，跳转到登录页面');
          const targetUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
          window.location.href = targetUrl;
        }
      } catch (error) {
        console.error('[AdminAuthGuard] 检查登录状态失败:', error);
        console.log('[AdminAuthGuard] 跳转到登录页面');
        const targetUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
        window.location.href = targetUrl;
      }
    };

    checkAuth();
  }, [pathname]);

  // 如果在登录页面，直接渲染子组件
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // 其他情况下，显示加载状态
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    </div>
  );
}
