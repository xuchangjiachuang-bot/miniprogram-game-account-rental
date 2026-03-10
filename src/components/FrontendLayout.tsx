'use client';

import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { ReactNode } from 'react';

interface FrontendLayoutProps {
  children: ReactNode;
}

/**
 * 前端布局包装器
 * 为非管理后台页面提供 MainLayout
 */
export function FrontendLayout({ children }: FrontendLayoutProps) {
  const pathname = usePathname();

  // 如果是管理后台路径，不使用 MainLayout
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  // 否则使用 MainLayout
  return <MainLayout>{children}</MainLayout>;
}
