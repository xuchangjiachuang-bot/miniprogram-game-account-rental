'use client';

import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { ReactNode } from 'react';

/**
 * 动态布局包装器
 * 根据路径决定是否使用 MainLayout
 */
export default function DynamicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 管理后台路径不使用 MainLayout
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  // API 路径不使用 MainLayout
  if (pathname?.startsWith('/api')) {
    return <>{children}</>;
  }

  // 其他路径使用 MainLayout
  return <MainLayout>{children}</MainLayout>;
}
