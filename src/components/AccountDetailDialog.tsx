'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Shield, Smartphone, Star, Target, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AccountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onOrder?: () => void;
  isLoggedIn?: boolean;
  isVerified?: boolean;
  onLoginRequired?: () => void;
}

function getRankText(rank: string) {
  const rankMap: Record<string, string> = {
    none: '无',
    bronze: '青铜',
    silver: '白银',
    gold: '黄金',
    platinum: '铂金',
    diamond: '钻石',
    blackeagle: '黑鹰',
    peak: '巅峰',
  };

  return rankMap[rank] || rank || '-';
}

function getRentalDescription(duration?: number) {
  if (!duration) return '-';

  if (duration >= 1) {
    const days = Math.floor(duration);
    const remainingHours = Math.round((duration - days) * 24);
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
  }

  return `${Math.round(duration * 24)}小时`;
}

function getValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return String(value);
}

export function AccountDetailDialog({
  open,
  onOpenChange,
  account,
  onOrder,
  isLoggedIn = false,
  isVerified = false,
  onLoginRequired,
}: AccountDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = useMemo(() => (Array.isArray(account?.images) ? account.images : []), [account?.images]);

  if (!account) {
    return null;
  }

  const hasImages = images.length > 0;
  const coinsDisplay =
    account.coins_display || (account.coins ? `${Number(account.coins).toFixed(2).replace(/\.00$/, '')}M` : '-');
  const ratioValue = account.ratio_display || account.ratio || account.customAttributes?.ratio || '-';
  const platform = account.customAttributes?.platform || account.platform || '-';
  const rawLoginMethod = account.customAttributes?.loginMethod || account.login_method || '-';
  const loginMethod =
    rawLoginMethod === 'qq'
      ? 'QQ账号密码'
      : rawLoginMethod === 'qq_scan'
        ? 'QQ扫码'
        : rawLoginMethod === 'wechat'
          ? '微信扫码'
          : rawLoginMethod === 'password'
            ? 'Steam账号密码'
            : rawLoginMethod;
  const province = account.customAttributes?.province || account.region?.province || account.province || '-';
  const city = account.customAttributes?.city || account.region?.city || account.city || '-';
  const region = province !== '-' && city !== '-' ? `${province} ${city}` : province !== '-' ? province : '-';
  const rentalDisplay = getRentalDescription(account.rental_duration);
  const skins = Array.isArray(account.skins) ? account.skins : [];
  const staminaLoadText = `${getValue(account.stamina_level)} / ${getValue(account.load_level)}`;
  const awmBullets = getValue(account.customAttributes?.awmBullets || account.awm_bullets);
  const level6Helmet = getValue(account.customAttributes?.level6Helmet || account.level6_helmet);
  const level6Armor = getValue(account.customAttributes?.level6Armor || account.level6_armor);
  const remark = account.customAttributes?.remark || account.remark || '';

  const handleOrderClick = () => {
    if (!isLoggedIn || !isVerified) {
      onLoginRequired?.();
      return;
    }

    onOrder?.();
  };

  const nextImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl">
        {hasImages ? (
          <div className="relative border-b bg-gray-100">
            <div className="relative aspect-[16/9] w-full">
              {imageError ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">图片加载失败</div>
              ) : (
                <img
                  src={images[currentImageIndex]}
                  alt={`${account.account_name || '账号图片'}-${currentImageIndex + 1}`}
                  className="h-full w-full object-contain bg-black/5"
                  onError={() => setImageError(true)}
                />
              )}
            </div>

            {images.length > 1 ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 shadow-lg"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 shadow-lg"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div>
              <DialogHeader className="mb-3">
                <DialogTitle className="text-xl font-bold leading-snug text-gray-900">
                  {account.title || account.account_name || '账号详情'}
                </DialogTitle>
              </DialogHeader>

              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700">
                  {platform}
                </Badge>
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                  {loginMethod}
                </Badge>
                <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-700">
                  {region}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-none">
                  <div className="text-xs font-medium text-orange-600">哈夫币</div>
                  <div className="mt-2 text-4xl font-bold text-orange-700">{coinsDisplay}</div>
                </Card>
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 shadow-none">
                  <div className="text-xs font-medium text-violet-600">比例</div>
                  <div className="mt-2 text-4xl font-bold text-violet-700">{ratioValue}</div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Card className="p-3 text-center shadow-none">
                <div className="text-[11px] text-gray-500">安全箱</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{getValue(account.safebox)}</div>
              </Card>
              <Card className="p-3 text-center shadow-none">
                <div className="text-[11px] text-gray-500">体力/负重</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{staminaLoadText}</div>
              </Card>
              <Card className="p-3 text-center shadow-none">
                <div className="text-[11px] text-gray-500">等级</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">Lv.{getValue(account.account_level)}</div>
              </Card>
              <Card className="p-3 text-center shadow-none">
                <div className="text-[11px] text-gray-500">段位</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{getRankText(account.rank)}</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Card className="p-3 shadow-none">
                <div className="text-[11px] text-gray-500">租金/押金</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  ¥{account.actual_rental?.toFixed(2) || '0.00'} / ¥{account.deposit?.toFixed(2) || '0.00'}
                </div>
              </Card>
              <Card className="p-3 shadow-none">
                <div className="text-[11px] text-gray-500">租期</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{rentalDisplay}</div>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50 p-3 shadow-none">
                <div className="text-[11px] text-emerald-600">总计</div>
                <div className="mt-2 text-2xl font-bold text-emerald-700">¥{account.total_price?.toFixed(2) || '0.00'}</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card className="p-3 shadow-none">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  基本信息
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">平台</span>
                    <span className="font-medium text-gray-900">{platform}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">上号方式</span>
                    <span className="font-medium text-gray-900">{loginMethod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">上号时间</span>
                    <span className="font-medium text-gray-900">
                      {account.available_time?.start || '-'} - {account.available_time?.end || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">地区</span>
                    <span className="font-medium text-gray-900">{region}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-3 shadow-none">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Star className="h-4 w-4 text-orange-500" />
                  账号属性
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">KD值</span>
                    <span className="font-medium text-gray-900">{getValue(account.kd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">段位</span>
                    <span className="font-medium text-gray-900">{getRankText(account.rank)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">等级</span>
                    <span className="font-medium text-gray-900">{getValue(account.account_level)}级</span>
                  </div>
                </div>
              </Card>

              <Card className="p-3 shadow-none">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Target className="h-4 w-4 text-green-600" />
                  游戏道具
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">AWM子弹</span>
                    <span className="font-medium text-gray-900">{awmBullets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">6头数量</span>
                    <span className="font-medium text-gray-900">{level6Helmet}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">6甲数量</span>
                    <span className="font-medium text-gray-900">{level6Armor}</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-3 shadow-none">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Shield className="h-4 w-4 text-pink-500" />
                皮肤信息
              </div>
              {skins.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skins.map((skin: string, index: number) => (
                    <Badge key={`${skin}-${index}`} variant="outline" className="border-pink-200 bg-pink-50 text-pink-700">
                      {skin}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">暂无皮肤信息</div>
              )}
            </Card>

            {account.description ? (
              <Card className="p-3 shadow-none">
                <div className="mb-2 text-sm font-semibold text-gray-900">账号描述</div>
                <div className="text-sm leading-6 text-gray-700">{account.description}</div>
              </Card>
            ) : null}

            {remark ? (
              <Card className="p-3 shadow-none">
                <div className="mb-2 text-sm font-semibold text-gray-900">备注信息</div>
                <div className="text-sm leading-6 text-gray-700">{remark}</div>
              </Card>
            ) : null}
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t bg-white p-3">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleOrderClick}
            >
              <Check className="mr-2 h-4 w-4" />
              立即下单
            </Button>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              请先完成登录后再下单
            </div>
          ) : null}

          {isLoggedIn && !isVerified ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              请先完成实名认证后再进行下单操作
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
