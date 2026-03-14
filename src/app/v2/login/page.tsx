import { Suspense } from 'react';
import { V2LoginPanel } from '@/components/v2/V2LoginPanel';

export default function V2LoginPage() {
  return (
    <Suspense fallback={null}>
      <V2LoginPanel />
    </Suspense>
  );
}
