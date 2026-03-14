'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoginPanel } from '@/components/LoginPanel';

interface LoginDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginDialog({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: LoginDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const defaultTrigger = (
    <Button
      variant="default"
      size="sm"
      className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 font-medium transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg"
    >
      微信登录
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null ? <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">微信登录</DialogTitle>
          <DialogDescription>电脑端请扫码，微信内打开时会直接授权登录。</DialogDescription>
        </DialogHeader>
        <LoginPanel mode="dialog" onClose={() => setOpen(false)} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
