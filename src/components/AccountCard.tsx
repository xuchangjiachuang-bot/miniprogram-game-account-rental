'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface AccountCardProps {
  account: any;
  onDetail?: (account: any) => void;
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
    const remainingHours = Math.round((duration - days) * 24);
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
  }

  return `${Math.round(duration * 24)}小时`;
}

function buildAccountTitle(account: any) {
  const parts: string[] = [];

  if (account.coins_display) {
    parts.push(`哈夫币 ${account.coins_display}`);
  }

  if (account.safebox) {
    const safeboxLabel = account.safebox === '3×3' || account.safebox === '3脳3'
      ? `顶级保险箱(${account.safebox})`
      : `保险箱(${account.safebox})`;
    parts.push(safeboxLabel);
  }

  if (account.stamina_level) {
    parts.push(`${account.stamina_level}体力`);
  }

  if (account.load_level) {
    parts.push(`${account.load_level}负重`);
  }

  if (account.rank) {
    parts.push(getRankText(account.rank));
  }

  const awmBullets = account.customAttributes?.awm_bullets || account.awm_bullets;
  if (awmBullets && awmBullets > 0) {
    parts.push(`${awmBullets} AWM`);
  }

  const level6Armor = account.customAttributes?.level_6_armor || account.level_6_armor;
  if (level6Armor && level6Armor > 0) {
    parts.push(`${level6Armor} 六甲`);
  }

  const level6Helmet = account.customAttributes?.level_6_helmet || account.level_6_helmet;
  if (level6Helmet && level6Helmet > 0) {
    parts.push(`${level6Helmet} 六头`);
  }

  if (account.kd) {
    parts.push(`KD ${account.kd}`);
  }

  if (Array.isArray(account.skins) && account.skins.length > 0) {
    parts.push(account.skins.join(' '));
  }

  return parts.join(' | ');
}

function getMoneyText(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export function AccountCard({ account, onDetail }: AccountCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = useMemo(
    () => (Array.isArray(account?.images) ? account.images.filter((item: unknown) => typeof item === 'string' && item.trim()) : []),
    [account?.images],
  );
  const tags = Array.isArray(account?.tags) ? account.tags : [];
  const accountTitle = buildAccountTitle(account);

  useEffect(() => {
    setCurrentImageIndex(0);
    setImageError(false);
  }, [account?.id, images.length]);

  const handleCardClick = () => {
    onDetail?.(account);
  };

  const nextImage = () => {
    if (images.length <= 1) {
      return;
    }

    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    setImageError(false);
  };

  const prevImage = () => {
    if (images.length <= 1) {
      return;
    }

    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setImageError(false);
  };

  const currentImage = images[currentImageIndex];

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      onClick={handleCardClick}
    >
      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
        {!currentImage || imageError ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        ) : (
          <img
            src={currentImage}
            alt={account.account_name || account.title || '账号图片'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                prevImage();
              }}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-50 transition-all hover:bg-black/70 hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                nextImage();
              }}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-50 transition-all hover:bg-black/70 hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {images.map((_: string, index: number) => (
                <div
                  key={`${account.id || account.account_id || 'account'}-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentImageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}

        {tags.length > 0 ? (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <Badge
                key={`${tag}-${index}`}
                variant="secondary"
                className="bg-black/50 text-[10px] text-white transition-colors hover:bg-black/60"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <CardContent className="space-y-2 p-3">
        <h3 className="truncate text-xs font-semibold leading-tight" title={accountTitle}>
          {accountTitle}
        </h3>

        <div className="flex items-center justify-start text-[10px]">
          <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700">
            {account.platform || account.login_method || '未知平台'}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-2">
          <div>
            <div className="text-[10px] font-medium text-orange-600">哈夫币</div>
            <div className="text-base font-bold text-orange-700">{account.coins_display || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-purple-600">比例</div>
            <div className="text-base font-bold text-purple-700">{account.ratio_display || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-[11px]">
          <div>
            <span className="block text-muted-foreground">保险箱</span>
            <span className="font-medium">{account.safebox || '-'}</span>
          </div>
          <div>
            <span className="block text-muted-foreground">体力/负重</span>
            <span className="font-medium">
              {account.stamina_level || '-'}
              /
              {account.load_level || '-'}
            </span>
          </div>
          <div>
            <span className="block text-muted-foreground">等级</span>
            <span className="font-medium">Lv.{account.account_level || '-'}</span>
          </div>
          <div>
            <span className="block text-muted-foreground">段位</span>
            <span className="font-medium">{getRankText(account.rank)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            KD: <span className="font-medium">{account.kd || '-'}</span>
          </span>
          <span>{account.region?.city || '-'}</span>
        </div>

        {Array.isArray(account.skins) && account.skins.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {account.skins.slice(0, 3).map((skin: string, index: number) => (
              <span
                key={`${skin}-${index}`}
                className="rounded bg-gradient-to-r from-purple-500 to-purple-600 px-1.5 py-0.5 text-[10px] font-medium text-white"
              >
                {skin}
              </span>
            ))}
            {account.skins.length > 3 ? (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                +{account.skins.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t pt-2">
          <div>
            <div className="text-[10px] text-muted-foreground">租金/押金</div>
            <div className="text-sm font-semibold text-purple-600">
              ¥{getMoneyText(account.actual_rental)} / ¥{getMoneyText(account.deposit)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">租期</div>
            <div className="text-sm font-semibold text-purple-600">
              {getRentalDescription(account.rental_duration)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">总价</div>
            <div className="text-lg font-bold text-green-600">¥{getMoneyText(account.total_price)}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <Button
          className="h-8 w-full cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg"
          onClick={(event) => {
            event.stopPropagation();
            handleCardClick();
          }}
        >
          查看详情
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
