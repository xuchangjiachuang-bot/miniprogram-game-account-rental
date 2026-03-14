'use client';

import { Suspense } from 'react';
import { LoginPanel } from '@/components/LoginPanel';

function LoginPageContent() {
  return <LoginPanel mode="page" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
