'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Star,
  TrendingUp,
  User,
  Calendar,
  Lock,
  Zap,
  Crown,
  Diamond,
  Award,
  Sparkles,
  Target,
  MapPin,
  Smartphone,
  Globe,
  MessageCircle,
} from 'lucide-react';

interface AccountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onOrder?: () => void;
  isLoggedIn?: boolean;
  isVerified?: boolean;
  onLoginRequired?: () => void;
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

  if (!account) return null;

  const images = Array.isArray(account.images) ? account.images : [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleOrderClick = () => {
    if (!isLoggedIn || !isVerified) {
      onLoginRequired?.();
      return;
    }

    onOrder?.();
  };

  const parseTitle = (title: string) => {
    if (!title) return {};
    const parts = title.split('|').map((part) => part.trim()).filter(Boolean);

    return {
      coins: parts.find((part) => part.includes('哈夫币')),
      safebox: parts.find((part) => part.includes('安全箱')),
      stamina: parts.find((part) => part.includes('体力')),
      load: parts.find((part) => part.includes('负重')),
      rank: parts.find((part) =>
        ['青铜', '白银', '黄金', '铂金', '钻石', '黑鹰', '巅峰', '大师', '王者'].some((rank) =>
          part.includes(rank)
        )
      ),
      bp: parts.find((part) => part.includes('BP')),
      skins: parts.filter((part) => part.includes('皮肤')),
    };
  };

  const titleInfo = parseTitle(account.title || account.account_name || '');

  const getRankText = (rank: string) => {
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
  };

  const getRentalDescription = (duration?: number) => {
    if (!duration) return '-';
    if (duration >= 1) {
      const days = Math.floor(duration);
      const remainingHours = Math.round((duration - days) * 24);
      if (remainingHours <= 0) return `${days}天`;
      return `${days}天${remainingHours}小时`;
    }
    const hours = Math.round(duration * 24);
    return `${hours}小时`;
  };

  const getAttributeValue = (value: any) => {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  };

  const ratioValue = account.ratio_display || account.ratio || account.customAttributes?.ratio || '-';
  const coinsValue = account.coins || parseFloat(String(account.coins_display || '').replace('M', '')) || 0;
  const coinsDisplay = account.coins_display || (coinsValue > 0 ? `${coinsValue}M` : '-');
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
  const skins = Array.isArray(account.skins) && account.skins.length > 0 ? account.skins : titleInfo.skins || [];
  const hasSkins = Array.isArray(skins) ? skins.length > 0 : Boolean(skins);
  const awmBullets = getAttributeValue(account.customAttributes?.awmBullets || account.awm_bullets);
  const level6Helmet = getAttributeValue(account.customAttributes?.level6Helmet || account.level6_helmet);
  const level6Armor = getAttributeValue(account.customAttributes?.level6Armor || account.level6_armor);
  const remark = account.customAttributes?.remark || account.remark || '-';
  const staminaLoadText = `${titleInfo.stamina?.replace('体力', '') || account.stamina_level || '-'} / ${
    titleInfo.load?.replace('负重', '') || account.load_level || '-'
  }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl">
        <div className="border-b bg-white p-3 md:p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.95fr)] lg:gap-4">
            {hasImages ? (
              <div className="relative overflow-hidden rounded-xl bg-gray-100">
                <div className="relative aspect-video w-full lg:aspect-[16/10]">
                  {imageError ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-300">
                          <X className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">图片加载失败</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={images[currentImageIndex]}
                      alt={`${account.account_name} - 图片 ${currentImageIndex + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  )}
                </div>

                {images.length > 1 ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-3 py-1">
                      {images.map((_: string, idx: number) => (
                        <div
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full transition-all ${
                            idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="min-w-0 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 md:p-4">
              <DialogHeader className="mb-3">
                <DialogTitle className="text-base font-bold leading-snug text-gray-900 md:text-lg">
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

              <div className="grid grid-cols-2 gap-2">
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3 shadow-none">
                  <p className="text-[11px] font-medium text-orange-600">哈夫币</p>
                  <p className="mt-1 text-2xl font-bold leading-none text-orange-700">{coinsDisplay}</p>
                </Card>
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 shadow-none">
                  <p className="text-[11px] font-medium text-violet-600">比例</p>
                  <p className="mt-1 text-2xl font-bold leading-none text-violet-700">{ratioValue}</p>
                </Card>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                  <p className="text-[10px] text-gray-500">安全箱</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">{titleInfo.safebox || account.safebox || '-'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                  <p className="text-[10px] text-gray-500">体力/负重</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">{staminaLoadText}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                  <p className="text-[10px] text-gray-500">等级</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">Lv.{account.account_level || '-'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                  <p className="text-[10px] text-gray-500">段位</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">{titleInfo.rank || getRankText(account.rank)}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Card className="border-gray-200 p-2 shadow-none">
                  <p className="text-[10px] text-gray-500">租金/押金</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    ¥{account.actual_rental?.toFixed(2) || '0.00'} / ¥{account.deposit?.toFixed(2) || '0.00'}
                  </p>
                </Card>
                <Card className="border-gray-200 p-2 shadow-none">
                  <p className="text-[10px] text-gray-500">租期</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{rentalDisplay}</p>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50 p-2 shadow-none">
                  <p className="text-[10px] text-emerald-600">总计</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    ¥{account.total_price?.toFixed(2) || '0.00'}
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                <Diamond className="h-3.5 w-3.5 text-purple-600" />
                价格详情
              </h3>

              <Card className="p-2 border-gray-200 shadow-none">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">租金</p>
                    <p className="text-base font-bold text-gray-900">¥{account.actual_rental?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">押金</p>
                    <p className="text-base font-bold text-gray-700">¥{account.deposit?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">租期</p>
                    <p className="text-xs font-bold text-gray-900 truncate" title={rentalDisplay}>
                      {rentalDisplay}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">总计</p>
                    <p className="text-base font-bold text-gray-900">¥{account.total_price?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-purple-600" />
                账号信息
              </h3>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-0.5 flex items-center gap-1 text-gray-600">
                    <Smartphone className="h-3 w-3" />
                    <span className="text-[10px]">平台</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{platform}</p>
                </div>

                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-0.5 flex items-center gap-1 text-gray-600">
                    <Shield className="h-3 w-3" />
                    <span className="text-[10px]">上号方式</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{loginMethod}</p>
                </div>

                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-0.5 flex items-center gap-1 text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">上号时间</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {account.available_time?.start || '-'} - {account.available_time?.end || '-'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-0.5 flex items-center gap-1 text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px]">地区</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">{region}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-600" />
                  账号属性
                </h3>

                <div className="space-y-1.5 rounded-lg border border-gray-200 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Crown className="h-3 w-3" />
                      <span>段位</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 font-semibold text-[10px] py-0.5 px-1.5">
                      {titleInfo.rank || getRankText(account.rank)}
                    </Badge>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>KD值</span>
                    </div>
                    <span className="font-semibold text-gray-900">{account.kd || '-'}</span>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="h-3 w-3" />
                      <span>等级</span>
                    </div>
                    <span className="font-semibold text-gray-900">{account.account_level || '-'}级</span>
                  </div>

                  {titleInfo.bp ? (
                    <>
                      <Separator className="my-1" />
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Award className="h-3 w-3" />
                          <span>通行证</span>
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-semibold text-[10px] py-0.5 px-1.5">
                          {titleInfo.bp}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-green-600" />
                  游戏道具
                </h3>

                <div className="space-y-1.5 rounded-lg border border-gray-200 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Zap className="h-3 w-3" />
                      <span>AWM子弹</span>
                    </div>
                    <span className="font-semibold text-gray-900">{awmBullets}</span>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Shield className="h-3 w-3" />
                      <span>6头数量</span>
                    </div>
                    <span className="font-semibold text-gray-900">{level6Helmet}</span>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Lock className="h-3 w-3" />
                      <span>6甲数量</span>
                    </div>
                    <span className="font-semibold text-gray-900">{level6Armor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-pink-600" />
                  皮肤信息
                </h3>

                <div className="rounded-lg border border-gray-200 p-2">
                  {hasSkins ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {Array.isArray(skins) ? (
                        skins.map((skin: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-white text-gray-700 border-pink-300 hover:bg-pink-50 transition-colors text-[10px] py-0.5 px-2"
                          >
                            {skin}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="bg-white text-gray-700 border-pink-300 text-[10px] py-0.5 px-2">
                          {skins}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="py-1 text-[10px] text-gray-400">暂无皮肤信息</div>
                  )}
                </div>
              </div>
            </div>

            {account.description ? (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-gray-900">账号描述</h3>
                  <Card className="bg-gray-50 p-2">
                    <p className="text-xs leading-relaxed text-gray-700">{account.description}</p>
                  </Card>
                </div>
              </>
            ) : null}

            {remark && remark !== '-' ? (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
                    备注信息
                  </h3>
                  <Card className="border-purple-200 bg-purple-50 p-2">
                    <p className="text-xs leading-relaxed text-gray-700">{remark}</p>
                  </Card>
                </div>
              </>
            ) : null}

            {account.created_at ? (
              <>
                <Separator />
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-1.5 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>上架时间</span>
                  </div>
                  <span className="font-medium">{new Date(account.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t bg-white p-3 flex-shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md font-semibold"
              onClick={handleOrderClick}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              立即下单
            </Button>
          </div>

          {!isLoggedIn ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 p-1.5">
              <Shield className="h-3.5 w-3.5 flex-shrink-0 text-purple-600" />
              <p className="text-[10px] text-purple-800">请先登录账号后再进行下单操作</p>
            </div>
          ) : null}

          {isLoggedIn && !isVerified ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 p-1.5">
              <Award className="h-3.5 w-3.5 flex-shrink-0 text-orange-600" />
              <p className="text-[10px] text-orange-800">请先完成实名认证后再进行下单操作</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
