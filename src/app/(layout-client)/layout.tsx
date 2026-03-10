'use client';

import { MainLayout } from '@/components/MainLayout';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 管理后台路径不使用 MainLayout
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  // 其他路径使用 MainLayout
  return <MainLayout>{children}</MainLayout>;
}
