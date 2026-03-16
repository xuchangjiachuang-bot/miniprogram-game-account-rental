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
  Coins,
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
  MessageCircle
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
  onLoginRequired
}: AccountDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!account) return null;

  const images = account.images || [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageError(false);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // 处理下单按钮点击
  const handleOrderClick = () => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    if (!isVerified) {
      onLoginRequired?.();
      return;
    }

    onOrder?.();
  };

  // 解析标题中的信息
  const parseTitle = (title: string) => {
    if (!title) return {};
    const parts = title.split('  |  ').map(p => p.trim()).filter(p => p);
    return {
      coins: parts.find(p => p.includes('哈夫币')),
      safebox: parts.find(p => p.includes('安全箱')),
      stamina: parts.find(p => p.includes('体力')),
      load: parts.find(p => p.includes('负重')),
      rank: parts.find(p => ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '王者'].some(r => p.includes(r))),
      skins: parts.filter(p => p.includes('皮肤') || ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '王者'].some(r => p.includes(r) && p !== parts.find(rp => rp.includes('体力')))),
      bp: parts.find(p => p.includes('BP'))
    };
  };

  const titleInfo = parseTitle(account.title || account.account_name || '');

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

  // 获取用户填写的比例信息
  const ratioValue = account.ratio_display || account.ratio || account.customAttributes?.ratio || '-';

  // 获取哈夫币数量（带M单位）
  const coinsValue = account.coins || parseFloat(account.coins_display?.replace('M', '')) || 0;
  const coinsDisplay = account.coins_display || (coinsValue > 0 ? `${coinsValue}M` : '-');

  // 获取平台信息
  const platform = account.customAttributes?.platform || account.platform || '-';

  // 获取上号方式
  const rawLoginMethod = account.customAttributes?.loginMethod || account.login_method || '-';
  const loginMethod = rawLoginMethod === 'qq'
    ? 'QQ账号密码'
    : rawLoginMethod === 'qq_scan'
      ? 'QQ扫码'
      : rawLoginMethod === 'wechat'
        ? '微信扫码'
        : rawLoginMethod === 'password'
          ? 'Steam账号密码'
          : rawLoginMethod;

  // 获取地区信息
  const province = account.customAttributes?.province || account.region?.province || account.province || '-';
  const city = account.customAttributes?.city || account.region?.city || account.city || '-';
  const region = (province !== '-' && city !== '-') ? `${province} ${city}` : (province !== '-' ? province : '-');

  // 获取租期（基于 rental_duration 天数计算）
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
  const rentalDisplay = getRentalDescription(account.rental_duration);

  // 获取皮肤信息
  const skins = account.skins || titleInfo.skins || [];
  const hasSkins = skins && skins.length > 0;

  // 获取游戏道具信息
  const getAttributeValue = (value: any) => {
    if (value === undefined || value === null || value === '') return '-';
    return value.toString();
  };
  const awmBullets = getAttributeValue(account.customAttributes?.awmBullets || account.awm_bullets);
  const level6Helmet = getAttributeValue(account.customAttributes?.level6Helmet || account.level6_helmet);
  const level6Armor = getAttributeValue(account.customAttributes?.level6Armor || account.level6_armor);

  // 获取备注信息
  const remark = account.customAttributes?.remark || account.remark || '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* 图片轮播区域 - 16:9 比例 */}
        {hasImages && (
          <div className="relative aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
            {imageError ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">图片加载失败</p>
                </div>
              </div>
            ) : (
              <img
                src={images[currentImageIndex]}
                alt={`${account.account_name} - 图片 ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )}

            {/* 图片控制按钮 */}
            {images.length > 1 && (
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
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-3 py-1 rounded-full">
                  {images.map((_: string, idx: number) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 主要内容区域 - 可滚动 */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {/* 标题 */}
            <div>
              <DialogHeader className="mb-2">
                <DialogTitle className="text-lg font-bold text-gray-900 leading-tight">
                  {account.title || account.account_name || '账号详情'}
                </DialogTitle>
              </DialogHeader>

              {/* 快速信息卡片 - 紧凑布局 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-purple-600 font-medium">哈夫币</p>
                      <p className="text-sm font-bold text-purple-900 truncate">{account.coins_display || titleInfo.coins || '-'}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-purple-600 font-medium">安全箱</p>
                      <p className="text-sm font-bold text-purple-900 truncate">{titleInfo.safebox || account.safebox || '-'}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-2 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-orange-600 font-medium">体力/负重</p>
                      <p className="text-sm font-bold text-orange-900 truncate">{titleInfo.stamina?.replace('体力', '') || account.stamina_level || '-'}/{titleInfo.load?.replace('负重', '') || account.load_level || '-'}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-green-600 font-medium">比例</p>
                      <p className="text-sm font-bold text-green-900 truncate">{ratioValue}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Separator />

            {/* 价格信息 - 整合租期，优化排版 */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                <Diamond className="h-3.5 w-3.5 text-purple-600" />
                价格详情
              </h3>

              <Card className="p-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-purple-200">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">租金</p>
                    <p className="text-base font-bold text-purple-600">
                      ¥{account.actual_rental?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">押金</p>
                    <p className="text-base font-bold text-gray-700">
                      ¥{account.deposit?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">租期</p>
                    <p className="text-xs font-bold text-purple-600 truncate" title={rentalDisplay}>
                      {rentalDisplay}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">总计</p>
                    <p className="text-base font-bold text-purple-700">
                      ¥{account.total_price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Separator />

            {/* 账号基本信息 - 新增平台、上号方式、地区 */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-purple-600" />
                账号信息
              </h3>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Smartphone className="h-3 w-3" />
                    <span className="text-[10px]">平台</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{platform}</p>
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Shield className="h-3 w-3" />
                    <span className="text-[10px]">上号方式</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{loginMethod}</p>
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">上号时间</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {account.available_time?.start || '-'} - {account.available_time?.end || '-'}
                  </p>
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px]">地区</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">{region}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* 详细信息 - 三列布局，减少空间占用 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 左侧：账号属性 */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-600" />
                  账号属性
                </h3>

                <div className="space-y-1.5 bg-gray-50 p-2 rounded-lg">
                  {/* 段位 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Crown className="h-3 w-3" />
                      <span>段位</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 font-semibold text-[10px] py-0.5 px-1.5">
                      {titleInfo.rank || getRankText(account.rank) || '-'}
                    </Badge>
                  </div>

                  <Separator className="my-1" />

                  {/* KD值 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>KD值</span>
                    </div>
                    <span className="font-semibold text-gray-900">{account.kd || '-'}</span>
                  </div>

                  <Separator className="my-1" />

                  {/* 账号等级 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="h-3 w-3" />
                      <span>等级</span>
                    </div>
                    <span className="font-semibold text-gray-900">{account.account_level || '-'}级</span>
                  </div>

                  {/* 战斗通行证 */}
                  {titleInfo.bp && (
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
                  )}
                </div>
              </div>

              {/* 游戏道具信息 */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-green-600" />
                  游戏道具
                </h3>

                <div className="space-y-1.5 bg-gray-50 p-2 rounded-lg">
                  {/* AWM子弹 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Zap className="h-3 w-3" />
                      <span>AWM子弹</span>
                    </div>
                    <span className="font-semibold text-gray-900">{awmBullets}</span>
                  </div>

                  <Separator className="my-1" />

                  {/* 6头 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Shield className="h-3 w-3" />
                      <span>6头数量</span>
                    </div>
                    <span className="font-semibold text-gray-900">{level6Helmet}</span>
                  </div>

                  <Separator className="my-1" />

                  {/* 6甲 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Lock className="h-3 w-3" />
                      <span>6甲数量</span>
                    </div>
                    <span className="font-semibold text-gray-900">{level6Armor}</span>
                  </div>
                </div>
              </div>

              {/* 皮肤信息 - 横向排列，减少占用空间 */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-pink-600" />
                  皮肤信息
                </h3>

                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-2 rounded-lg border border-pink-200">
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
                    <div className="text-gray-400 text-[10px] py-1">
                      暂无皮肤信息
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 账号描述 */}
            {account.description && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-gray-900">账号描述</h3>
                <Card className="p-2 bg-gray-50">
                  <p className="text-xs text-gray-700 leading-relaxed">{account.description}</p>
                </Card>
              </div>
            )}

            {/* 备注信息 */}
            {remark && remark !== '-' && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
                  备注信息
                </h3>
                <Card className="p-2 bg-purple-50 border-purple-200">
                  <p className="text-xs text-gray-700 leading-relaxed">{remark}</p>
                </Card>
              </div>
            )}

            {/* 上架时间 */}
            {account.created_at && (
              <div className="flex items-center justify-between text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span>上架时间</span>
                </div>
                <span className="font-medium">
                  {new Date(account.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部操作区域 - 固定在底部 */}
        <div className="p-3 border-t bg-white flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md font-semibold"
              onClick={handleOrderClick}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              立即下单
            </Button>
          </div>

          {/* 登录提示 */}
          {!isLoggedIn && (
            <div className="p-1.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
              <p className="text-[10px] text-purple-800">
                请先登录账号后再进行下单操作
              </p>
            </div>
          )}

          {/* 实名认证提示 */}
          {isLoggedIn && !isVerified && (
            <div className="p-1.5 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
              <p className="text-[10px] text-orange-800">
                请先完成实名认证后再进行下单操作
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
