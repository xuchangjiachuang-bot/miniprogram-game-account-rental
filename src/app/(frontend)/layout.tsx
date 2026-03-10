import { MainLayout } from '@/components/MainLayout';

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
