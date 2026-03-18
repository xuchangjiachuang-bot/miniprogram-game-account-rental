'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Shield, Smartphone, Star, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { resolvePublicFileReference } from '@/lib/storage-public';

interface AccountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onOrder?: () => void;
  isLoggedIn?: boolean;
  isVerified?: boolean;
  onLoginRequired?: () => void;
}

function getRankText(rank?: string) {
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

  return rankMap[rank || ''] || rank || '-';
}

function getRentalDescription(duration?: number) {
  if (!duration) {
    return '-';
  }

  if (duration >= 1) {
    const days = Math.floor(duration);
    const hours = Math.round((duration - days) * 24);
    return hours > 0 ? `${days}天 ${hours}小时` : `${days}天`;
  }

  return `${Math.round(duration * 24)}小时`;
}

function getTextValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return String(value);
}

function getMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function normalizeLoginMethod(value?: string) {
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
  const sources = [account?.images, account?.screenshots];

  for (const source of sources) {
    if (Array.isArray(source)) {
      const items = source
        .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
        .map((item: string) => resolvePublicFileReference(item))
        .filter((item: string | null): item is string => Boolean(item));
      if (items.length > 0) {
        return items;
      }
    }
  }

  return [];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <span className="text-[12px] leading-4 text-slate-500">{label}</span>
      <span className="text-sm font-medium leading-4 text-slate-900 break-all sm:break-normal">{value}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'slate',
  compact = false,
  className = '',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'orange' | 'violet' | 'emerald';
  compact?: boolean;
  className?: string;
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
    <Card className={`rounded-2xl border px-4 py-3 shadow-none ${toneClassName} ${className}`}>
      <div className="text-[11px] font-medium tracking-[0.01em]">{label}</div>
      <div
        className={`mt-2 font-bold leading-none ${compact ? 'whitespace-nowrap text-[0.95rem] sm:text-[1.15rem] lg:text-[1.3rem] tracking-tight' : 'text-xl sm:text-[1.9rem]'}`}
      >
        {value}
      </div>
    </Card>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-slate-50/55 p-3 shadow-none">
      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </div>
      {children}
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

  const accountTitle = account.title || account.account_name || '账号详情';
  const coinsDisplay =
    account.coins_display || (account.coins ? `${Number(account.coins).toFixed(2).replace(/\.00$/, '')}M` : '-');
  const ratioValue = getTextValue(account.ratio_display || account.ratio || account.customAttributes?.ratio);
  const platform = getTextValue(account.customAttributes?.platform || account.platform);
  const loginMethod = normalizeLoginMethod(account.customAttributes?.loginMethod || account.login_method);
  const province = account.customAttributes?.province || account.region?.province || account.province || '';
  const city = account.customAttributes?.city || account.region?.city || account.city || '';
  const region = [province, city].filter(Boolean).join(' ') || '-';
  const rentalDisplay = getRentalDescription(account.rental_duration);
  const skins = Array.isArray(account.skins) ? account.skins.filter(Boolean) : [];
  const availableTime =
    account.available_time?.start || account.available_time?.end
      ? `${account.available_time?.start || '-'} - ${account.available_time?.end || '-'}`
      : '-';
  const description = getTextValue(account.description) === '-' ? '' : String(account.description);
  const remark = getTextValue(account.customAttributes?.remark || account.remark) === '-'
    ? ''
    : String(account.customAttributes?.remark || account.remark);

  const summaryRows = [
    { label: '保险箱', value: getTextValue(account.safebox) },
    { label: '体力 / 负重', value: `${getTextValue(account.stamina_level)} / ${getTextValue(account.load_level)}` },
    { label: 'KD', value: getTextValue(account.kd) },
    { label: '可上号时间', value: availableTime },
    { label: '账号等级', value: `${getTextValue(account.account_level)}级` },
    { label: 'AWM 子弹', value: getTextValue(account.customAttributes?.awmBullets || account.awm_bullets) },
    { label: '6头数量', value: getTextValue(account.customAttributes?.level6Helmet || account.level6_helmet) },
    { label: '6甲数量', value: getTextValue(account.customAttributes?.level6Armor || account.level6_armor) },
  ];

  const handleOrderClick = () => {
    if (!isLoggedIn || !isVerified) {
      onLoginRequired?.();
      return;
    }

    onOrder?.();
  };

  const currentImage = images[currentImageIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[28px] border-none bg-transparent p-0 shadow-none sm:w-[96vw] sm:max-w-[1100px]">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 p-3 pb-3 sm:p-4">
              {currentImage ? (
                <div className="relative border-b border-slate-200 bg-white">
                  <div className="relative flex h-[210px] w-full items-center justify-center overflow-hidden px-3 py-3 sm:h-[240px] sm:px-4 sm:py-4 lg:h-[260px]">
                    {imageError ? (
                      <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                        图片加载失败
                      </div>
                    ) : (
                      <img
                        src={currentImage}
                        alt={`${accountTitle}-${currentImageIndex + 1}`}
                        className="max-h-full max-w-full rounded-xl object-contain shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
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
                        onClick={() => {
                          setImageError(false);
                          setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
                        onClick={() => {
                          setImageError(false);
                          setCurrentImageIndex((prev) => (prev + 1) % images.length);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2.5 py-1 text-xs text-white">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="space-y-2">
                  <DialogHeader className="space-y-0">
                    <DialogTitle className="text-lg font-semibold leading-7 text-slate-900 sm:text-[1.9rem] sm:leading-9">
                      {accountTitle}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[12px] text-blue-700">
                      {platform}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[12px] text-violet-700">
                      {loginMethod}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] text-slate-700">
                      {region}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                  <MetricCard label="哈夫币" value={coinsDisplay} tone="orange" />
                  <MetricCard label="比例" value={ratioValue} tone="violet" />
                  <MetricCard
                    label="租金 / 押金"
                    value={`¥${getMoney(account.actual_rental)} / ¥${getMoney(account.deposit)}`}
                    compact
                    className="lg:col-span-2"
                  />
                  <MetricCard label="总价" value={`¥${getMoney(account.total_price)}`} tone="emerald" />
                  <MetricCard label="租期" value={rentalDisplay} />
                </div>

                <SectionCard title="账号概览" icon={<Smartphone className="h-4 w-4 text-blue-600" />}>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {summaryRows.map((item) => (
                      <InfoRow key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="皮肤信息" icon={<Shield className="h-4 w-4 text-pink-500" />}>
                  {skins.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skins.map((skin: string, index: number) => (
                        <Badge
                          key={`${skin}-${index}`}
                          variant="outline"
                          className="rounded-full border-pink-200 bg-pink-50 px-2.5 py-0.5 text-[12px] text-pink-700"
                        >
                          {skin}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">暂无皮肤信息</div>
                  )}
                </SectionCard>

                {description || remark ? (
                  <div className="grid items-start gap-3 xl:grid-cols-2">
                    {description ? (
                      <SectionCard title="账号描述" icon={<Star className="h-4 w-4 text-amber-500" />}>
                        <div className="text-sm leading-6 text-slate-700">{description}</div>
                      </SectionCard>
                    ) : null}

                    {remark ? (
                      <SectionCard title="备注信息" icon={<Shield className="h-4 w-4 text-pink-500" />}>
                        <div className="text-sm leading-6 text-slate-700">{remark}</div>
                      </SectionCard>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>

          <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3">
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                onClick={handleOrderClick}
              >
                <Check className="mr-2 h-4 w-4" />
                立即下单
              </Button>
            </div>

            {!isLoggedIn ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                请先登录后再下单
              </div>
            ) : null}

            {isLoggedIn && !isVerified ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                请先完成实名认证后再进行下单
              </div>
            ) : null}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
