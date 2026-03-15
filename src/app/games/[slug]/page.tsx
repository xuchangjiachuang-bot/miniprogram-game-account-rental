import type { Metadata } from 'next';
import { generateContentPageMetadata, renderContentPage } from '@/components/content-page-renderer';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateContentPageMetadata('games', props);
}

export default async function GameDetailPage(props: PageProps) {
  return renderContentPage('games', props);
}
