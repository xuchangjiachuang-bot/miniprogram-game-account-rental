import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { UserProvider } from '@/contexts/UserContext';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '哈夫币租赁平台',
    template: '%s | 哈夫币租赁平台',
  },
  description:
    '专业的三角洲行动虚拟货币租赁服务平台，提供安全、便捷的账号租赁体验。',
  keywords: [
    '哈夫币租赁',
    '三角洲行动',
    '账号租赁',
    '虚拟货币',
    '游戏租赁',
  ],
  authors: [{ name: '哈夫币租赁平台' }],
  generator: 'Next.js',
  openGraph: {
    title: '哈夫币租赁平台 | 专业的游戏虚拟货币租赁服务',
    description:
      '专业的三角洲行动虚拟货币租赁服务平台，提供安全、便捷的账号租赁体验。',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <UserProvider>
          <Toaster />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
