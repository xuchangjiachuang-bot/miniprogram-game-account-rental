'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Phone } from 'lucide-react';

interface WechatBindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WechatBindDialog({ open, onOpenChange, onSuccess }: WechatBindDialogProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'bind' | 'success'>('bind');

  const wechatInfo = {
    openid: '',
    nickname: '',
    avatar: ''
  };

  useEffect(() => {
    if (open) {
      // 读取微信临时cookie
      wechatInfo.openid = document.cookie.split('; ').find(row => row.startsWith('wechat_openid='))?.split('=')[1] || '';
      wechatInfo.nickname = document.cookie.split('; ').find(row => row.startsWith('wechat_nickname='))?.split('=')[1] || '';
      wechatInfo.avatar = document.cookie.split('; ').find(row => row.startsWith('wechat_avatar='))?.split('=')[1] || '';
    }
  }, [open]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-code', phone })
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || '发送验证码失败');
      }
    } catch {
      setError('发送验证码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位验证码');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 使用微信登录的特殊action
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wechat-bind-phone',
          phone,
          code,
          openid: wechatInfo.openid,
          nickname: wechatInfo.nickname,
          avatar: wechatInfo.avatar
        })
      });

      const data = await response.json();

      if (data.success) {
        // 清除微信临时cookie
        document.cookie = 'wechat_openid=; path=/; max-age=0';
        document.cookie = 'wechat_nickname=; path=/; max-age=0';
        document.cookie = 'wechat_avatar=; path=/; max-age=0';

        setStep('success');
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
          setStep('bind');
        }, 1500);
      } else {
        setError(data.error || '绑定失败');
      }
    } catch {
      setError('绑定失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'bind' ? '绑定手机号' : '绑定成功'}
          </DialogTitle>
          <DialogDescription>
            {step === 'bind' 
              ? '请绑定手机号以完成微信登录' 
              : '微信登录成功，正在跳转...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'bind' ? (
          <div className="space-y-4 pt-4">
            {/* 微信用户信息 */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {wechatInfo.avatar && (
                <img 
                  src={wechatInfo.avatar} 
                  alt={wechatInfo.nickname || '微信用户'} 
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{wechatInfo.nickname || '微信用户'}</div>
                <div className="text-sm text-muted-foreground">微信用户</div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                为保障您的账号安全，请绑定手机号
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="bind-phone">手机号</Label>
              <Input
                id="bind-phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bind-code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="bind-code"
                  type="text"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '发送验证码'}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleBind}
              disabled={loading}
            >
              {loading ? '绑定中...' : '确认绑定'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">绑定成功</p>
            <p className="text-sm text-muted-foreground">正在跳转...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
