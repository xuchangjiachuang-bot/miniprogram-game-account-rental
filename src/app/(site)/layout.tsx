import { MainLayout } from '@/components/MainLayout';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
