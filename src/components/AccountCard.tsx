'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface AccountCardProps {
  account: any;
  onDetail?: (account: any) => void;
}

export function AccountCard({ account, onDetail }: AccountCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // 段位映射
  const getRankText = (rank: string) => {
    const rankMap: Record<string, string> = {
      'none': '无',
      'bronze': '青铜',
      'silver': '白银',
      'gold': '黄金',
      'platinum': '铂金',
      'diamond': '钻石',
      'blackeagle': '黑鹰',
      'peak': '巅峰'
    };
    return rankMap[rank] || rank;
  };

  // 计算租期描述
  const getRentalDescription = (duration?: number) => {
    if (!duration) return '-';
    // duration 可以是天数或小时数
    // 如果 duration >= 1，认为它是天数；否则认为它是小时数
    if (duration >= 1) {
      const days = Math.floor(duration);
      const remainingHours = (duration - days) * 24;
      if (remainingHours === 0) return `${days}天`;
      if (remainingHours >= 1) return `${days}天${Math.floor(remainingHours)}小时`;
      return `${days}天`;
    } else {
      const hours = Math.floor(duration * 24);
      return `${hours}小时`;
    }
  };

  // 构建账号标题
  const buildAccountTitle = (acc: any) => {
    const parts = [];

    // 哈夫币
    if (acc.coins_display) {
      parts.push(`哈夫币${acc.coins_display}`);
    }

    // 安全箱
    if (acc.safebox) {
      const safeboxLevel = acc.safebox === '3×3' ? '顶级' : '';
      parts.push(`${safeboxLevel}安全箱(${acc.safebox})`);
    }

    // 体力
    if (acc.stamina_level) {
      parts.push(`${acc.stamina_level}体力`);
    }

    // 负重
    if (acc.load_level) {
      parts.push(`${acc.load_level}负重`);
    }

    // 段位
    if (acc.rank) {
      parts.push(getRankText(acc.rank));
    }

    // AWM子弹
    const awmBullets = acc.customAttributes?.awm_bullets || acc.awm_bullets;
    if (awmBullets && awmBullets > 0) {
      parts.push(`${awmBullets}AWM`);
    }

    // 6甲
    const level6Armor = acc.customAttributes?.level_6_armor || acc.level_6_armor;
    if (level6Armor && level6Armor > 0) {
      parts.push(`${level6Armor}六甲`);
    }

    // 6头
    const level6Helmet = acc.customAttributes?.level_6_helmet || acc.level_6_helmet;
    if (level6Helmet && level6Helmet > 0) {
      parts.push(`${level6Helmet}六头`);
    }

    // KD值
    if (acc.kd) {
      parts.push(`KD ${acc.kd}`);
    }

    // 皮肤
    if (acc.skins && acc.skins.length > 0) {
      parts.push(acc.skins.join(' '));
    }

    return parts.join(' | ');
  };

  const accountTitle = buildAccountTitle(account);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % account.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + account.images.length) % account.images.length);
  };

  const handleCardClick = () => {
    onDetail?.(account);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden" onClick={handleCardClick}>
      {/* 16:9 图片展示 */}
      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        ) : (
          <Image
            src={account.images[currentImageIndex]}
            alt={account.account_name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* 图片切换按钮 */}
        {account.images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-50 hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-50 hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* 图片指示器 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {account.images.map((_: string, i: number) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* 标签 */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {account.tags.map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[10px] bg-black/50 text-white hover:bg-black/60 transition-colors">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        {/* 账号标题 - 紧凑单行 */}
        <h3 className="font-semibold text-xs leading-tight truncate" title={accountTitle}>
          {accountTitle}
        </h3>

        {/* 平台标签 */}
        <div className="flex justify-start items-center text-[10px]">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            {account.platform || account.login_method || '未知平台'}
          </Badge>
        </div>

        {/* 哈夫币数量和比例 - 醒目位置 */}
        <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-yellow-50 p-2 rounded-lg border border-orange-200">
          <div>
            <div className="text-[10px] text-orange-600 font-medium">哈夫币</div>
            <div className="text-base font-bold text-orange-700">{account.coins_display || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-purple-600 font-medium">比例</div>
            <div className="text-base font-bold text-purple-700">{account.ratio_display || '-'}</div>
          </div>
        </div>

        {/* 核心属性 - 紧凑布局 */}
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          <div>
            <span className="text-muted-foreground block">安全箱</span>
            <span className="font-medium">{account.safebox}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">体力/负重</span>
            <span className="font-medium">{account.stamina_level}/{account.load_level}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">等级</span>
            <span className="font-medium">Lv.{account.account_level}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">段位</span>
            <span className="font-medium">{getRankText(account.rank)}</span>
          </div>
        </div>

        {/* KD和地区 */}
        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
          <span>KD: <span className="font-medium">{account.kd}</span></span>
          <span>{account.region?.city || '-'}</span>
        </div>

        {/* 皮肤标签 */}
        {account.skins && account.skins.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {account.skins.slice(0, 3).map((skin: string, i: number) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-[10px] rounded font-medium"
              >
                {skin}
              </span>
            ))}
            {account.skins.length > 3 && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded font-medium">
                +{account.skins.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 价格信息 */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <div className="text-[10px] text-muted-foreground">租金/押金</div>
            <div className="text-sm font-semibold text-purple-600">¥{account.actual_rental?.toFixed(2) || '0.00'} / ¥{account.deposit?.toFixed(2) || '0.00'}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">租期</div>
            <div className="text-sm font-semibold text-purple-600">{getRentalDescription(account.rental_duration)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">总价</div>
            <div className="text-lg font-bold text-green-600">¥{account.total_price?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full h-8 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer font-medium"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          查看详情
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
