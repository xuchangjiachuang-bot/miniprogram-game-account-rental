import type { Metadata } from 'next';
import { generateContentPageMetadata, renderContentPage } from '@/components/content-page-renderer';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateContentPageMetadata('rules', props);
}

export default async function RuleDetailPage(props: PageProps) {
  return renderContentPage('rules', props);
}
