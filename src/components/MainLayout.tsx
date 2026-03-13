'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useEffect, useState } from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  // 确保客户端渲染后再判断
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 在服务器端或未挂载时，默认显示完整布局
  const isAdmin = isMounted && pathname?.startsWith('/admin');
  const isStandaloneAuthPage = pathname === '/login';

  // Admin 页面不显示 Header 和 Footer
  if (isAdmin || isStandaloneAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
