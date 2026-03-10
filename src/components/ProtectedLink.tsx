'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginDialog } from '@/components/LoginDialog';

interface ProtectedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ProtectedLink({ href, children, className }: ProtectedLinkProps) {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      setIsAuthenticated(data.success);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push(href);
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
    router.push(href);
  };

  return (
    <>
      <a href={href} onClick={handleClick} className={className}>
        {children}
      </a>
      <LoginDialog
        trigger={null}
        open={showLogin}
        onOpenChange={setShowLogin}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
