import type { Metadata } from 'next';
import { generateContentPageMetadata, renderContentPage } from '@/components/content-page-renderer';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateContentPageMetadata('topics', props);
}

export default async function TopicDetailPage(props: PageProps) {
  return renderContentPage('topics', props);
}
