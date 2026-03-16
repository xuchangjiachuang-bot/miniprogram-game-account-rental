'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
  Star,
  Target,
} from 'lucide-react';
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
    none: '无段位',
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
    return remainingHours > 0 ? `${days}天 ${remainingHours}小时` : `${days}天`;
  }

  return `${Math.round(duration * 24)}小时`;
}

function getValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return String(value);
}

function getMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function normalizeLoginMethod(value: string) {
  switch (value) {
    case 'qq':
      return 'QQ账号密码';
    case 'qq_scan':
      return 'QQ扫码';
    case 'wechat':
      return '微信扫码';
    case 'password':
      return '账号密码';
    default:
      return value || '-';
  }
}

function getImageList(account: any) {
  if (!Array.isArray(account?.images)) return [];

  return account.images.filter((image: unknown) => typeof image === 'string' && image.trim().length > 0);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium leading-5 text-slate-900">{value}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'orange' | 'violet' | 'emerald';
}) {
  const toneClassName =
    tone === 'orange'
      ? 'border-orange-200 bg-orange-50 text-orange-700'
      : tone === 'violet'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : tone === 'emerald'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <Card className={`rounded-xl border p-3 shadow-none ${toneClassName}`}>
      <div className="text-[11px] font-medium">{label}</div>
      <div className="mt-1.5 text-xl font-bold leading-none sm:text-2xl">{value}</div>
    </Card>
  );
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

  const images = useMemo(() => getImageList(account), [account]);

  useEffect(() => {
    setCurrentImageIndex(0);
    setImageError(false);
  }, [account?.id, open]);

  if (!account) {
    return null;
  }

  const coinsDisplay =
    account.coins_display || (account.coins ? `${Number(account.coins).toFixed(2).replace(/\.00$/, '')}M` : '-');
  const ratioValue = getValue(account.ratio_display || account.ratio || account.customAttributes?.ratio);
  const platform = getValue(account.customAttributes?.platform || account.platform);
  const loginMethod = normalizeLoginMethod(account.customAttributes?.loginMethod || account.login_method || '-');
  const province = account.customAttributes?.province || account.region?.province || account.province || '';
  const city = account.customAttributes?.city || account.region?.city || account.city || '';
  const region = [province, city].filter(Boolean).join(' ') || '-';
  const rentalDisplay = getRentalDescription(account.rental_duration);
  const skins = Array.isArray(account.skins) ? account.skins.filter(Boolean) : [];
  const staminaLoadText = `${getValue(account.stamina_level)} / ${getValue(account.load_level)}`;
  const awmBullets = getValue(account.customAttributes?.awmBullets || account.awm_bullets);
  const level6Helmet = getValue(account.customAttributes?.level6Helmet || account.level6_helmet);
  const level6Armor = getValue(account.customAttributes?.level6Armor || account.level6_armor);
  const remark = getValue(account.customAttributes?.remark || account.remark) === '-' ? '' : String(account.customAttributes?.remark || account.remark);
  const description = getValue(account.description) === '-' ? '' : String(account.description);
  const availableTime =
    account.available_time?.start || account.available_time?.end
      ? `${account.available_time?.start || '-'} - ${account.available_time?.end || '-'}`
      : '-';

  const handleOrderClick = () => {
    if (!isLoggedIn || !isVerified) {
      onLoginRequired?.();
      return;
    }

    onOrder?.();
  };

  const showPrevImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const showNextImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] w-[96vw] max-w-5xl flex-col overflow-hidden rounded-2xl p-0">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4 pb-5 sm:p-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {images.length > 0 ? (
                <div className="relative border-b border-slate-200 bg-slate-100">
                  <div className="relative h-[210px] w-full sm:h-[260px] lg:h-[300px]">
                    {imageError ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">图片加载失败</div>
                    ) : (
                      <img
                        src={images[currentImageIndex]}
                        alt={`${account.account_name || '账号图片'}-${currentImageIndex + 1}`}
                        className="h-full w-full object-contain"
                        onError={() => setImageError(true)}
                      />
                    )}
                  </div>

                  {images.length > 1 ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
                        onClick={showPrevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
                        onClick={showNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4 p-4 sm:p-5">
                <div className="space-y-3">
                  <DialogHeader className="space-y-0">
                    <DialogTitle className="text-lg font-semibold leading-7 text-slate-900 sm:text-xl">
                      {account.title || account.account_name || '账号详情'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      {platform}
                    </Badge>
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                      {loginMethod}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {region}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <MetricCard label="哈夫币" value={coinsDisplay} tone="orange" />
                  <MetricCard label="比例" value={ratioValue} tone="violet" />
                  <MetricCard label="租金 / 押金" value={`¥${getMoney(account.actual_rental)} / ¥${getMoney(account.deposit)}`} />
                  <MetricCard label="总价" value={`¥${getMoney(account.total_price)}`} tone="emerald" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <DetailItem label="保险箱" value={getValue(account.safebox)} />
                  <DetailItem label="体力 / 负重" value={staminaLoadText} />
                  <DetailItem label="等级" value={`Lv.${getValue(account.account_level)}`} />
                  <DetailItem label="段位" value={getRankText(account.rank)} />
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="rounded-xl border-slate-200 p-3 shadow-none">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        基本信息
                      </div>
                      <div className="space-y-2">
                        <DetailItem label="平台" value={platform} />
                        <DetailItem label="上号方式" value={loginMethod} />
                        <DetailItem label="可上号时间" value={availableTime} />
                        <DetailItem label="地区" value={region} />
                        <DetailItem label="租期" value={rentalDisplay} />
                      </div>
                    </Card>

                    <Card className="rounded-xl border-slate-200 p-3 shadow-none">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Star className="h-4 w-4 text-amber-500" />
                        账号属性
                      </div>
                      <div className="space-y-2">
                        <DetailItem label="KD" value={getValue(account.kd)} />
                        <DetailItem label="段位" value={getRankText(account.rank)} />
                        <DetailItem label="等级" value={`${getValue(account.account_level)}级`} />
                        <DetailItem label="保险箱" value={getValue(account.safebox)} />
                      </div>
                    </Card>
                  </div>

                  <Card className="rounded-xl border-slate-200 p-3 shadow-none">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Target className="h-4 w-4 text-emerald-600" />
                      游戏道具
                    </div>
                    <div className="grid gap-2">
                      <DetailItem label="AWM 子弹" value={awmBullets} />
                      <DetailItem label="6头数量" value={level6Helmet} />
                      <DetailItem label="6甲数量" value={level6Armor} />
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Shield className="h-4 w-4 text-pink-500" />
                        皮肤信息
                      </div>
                      {skins.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skins.map((skin: string, index: number) => (
                            <Badge
                              key={`${skin}-${index}`}
                              variant="outline"
                              className="border-pink-200 bg-pink-50 text-pink-700"
                            >
                              {skin}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">暂无皮肤信息</div>
                      )}
                    </div>
                  </Card>
                </div>

                {description ? (
                  <Card className="rounded-xl border-slate-200 p-3 shadow-none">
                    <div className="mb-2 text-sm font-semibold text-slate-900">账号描述</div>
                    <div className="text-sm leading-6 text-slate-700">{description}</div>
                  </Card>
                ) : null}

                {remark ? (
                  <Card className="rounded-xl border-slate-200 p-3 shadow-none">
                    <div className="mb-2 text-sm font-semibold text-slate-900">备注信息</div>
                    <div className="text-sm leading-6 text-slate-700">{remark}</div>
                  </Card>
                ) : null}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t border-slate-200 bg-white p-3 sm:px-5 sm:py-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button
              type="button"
              className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
              onClick={handleOrderClick}
            >
              <Check className="mr-2 h-4 w-4" />
              立即下单
            </Button>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              请先登录后再下单
            </div>
          ) : null}

          {isLoggedIn && !isVerified ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              请先完成实名认证后再进行下单
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
