'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Shield, TrendingUp, Check, MapPin, MessageCircle, X, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { AccountCard } from '@/components/AccountCard';
import { ProtectedLink } from '@/components/ProtectedLink';
import { AccountDetailDialog } from '@/components/AccountDetailDialog';
import { CustomerServiceButton } from '@/components/customer-service-button';
import { LoginDialog } from '@/components/LoginDialog';
import { useUser } from '@/contexts/UserContext';
import { getToken } from '@/lib/auth-token';
import { loadConfigFromCache, saveConfigToCache } from '@/lib/config-sync';
import { useConfigUpdate } from '@/lib/config-sync-manager';
import { resolvePublicFileReferences } from '@/lib/storage-public';
import { normalizeHomepageLinkUrl } from '@/lib/homepage-config-normalizer';

export default function Home() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    minCoins: string;
    maxCoins: string;
    rank: string;
    safebox: string;
    staminaLevel: string;
    loadLevel: string;
    province: string;
    city: string;
    minRental: string;
    maxRental: string;
    minDeposit: string;
    maxDeposit: string;
    minTotal: string;
    maxTotal: string;
    platformLogin: string;
    skinOptions: string[];
  }>({
    minCoins: '',
    maxCoins: '',
    rank: 'all',
    safebox: 'all',
    staminaLevel: 'all',
    loadLevel: 'all',
    province: 'all',
    city: 'all',
    minRental: '',
    maxRental: '',
    minDeposit: '',
    maxDeposit: '',
    minTotal: '',
    maxTotal: '',
    platformLogin: 'all',
    skinOptions: [] as string[]
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showCustomerChat, setShowCustomerChat] = useState(false);
  const [customerServiceConfig, setCustomerServiceConfig] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAccountDetail, setShowAccountDetail] = useState(false);
  const [skinList, setSkinList] = useState<string[]>([]);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const router = useRouter();
  const heroGradientStyle: CSSProperties = {
    backgroundImage: 'linear-gradient(90deg, #2563eb 0%, #9333ea 100%)',
  };

  const handleOrderRequired = () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    router.push('/user-center?tab=verification');
  };

  const handleCreateOrder = async () => {
    if (!selectedAccount || creatingOrder) {
      return;
    }

    const token = getToken();
    if (!token) {
      setShowLoginDialog(true);
      return;
    }

    try {
      setCreatingOrder(true);
      const rentDays = Number(selectedAccount.rental_duration || 1);
      const rentHours = Math.max(1, Math.round(rentDays * 24));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          rent_hours: rentHours,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '立即下单失败');
      }

      setShowAccountDetail(false);
      router.push(`/orders/${result.data.id}`);
    } catch (error) {
      console.error('创建订单失败:', error);
      alert(error instanceof Error ? error.message : '立即下单失败，请重试');
    } finally {
      setCreatingOrder(false);
    }
  };

  const sanitizeAccountImages = (screenshots: unknown) => {
    const sourceList = Array.isArray(screenshots) ? screenshots : screenshots ? [screenshots] : [];
    const sanitized = resolvePublicFileReferences(sourceList).filter((value) => !value.includes('example.com'));

    return sanitized.length > 0 ? sanitized : ['/placeholder-image.svg'];
  };

  // 根据UserContext的user状态设置登录和认证状态
  const isLoggedIn = !!user;
  const isVerified = user?.isRealNameVerified || false;

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 监听配置更新（通过 SSE）
  useConfigUpdate('all', (event) => {
    console.log('首页收到配置更新:', event);
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // 1. 优先从缓存加载配置（秒级）
      try {
        const cachedConfig = loadConfigFromCache<any>();
        if (cachedConfig?.skinOptions) {
          const enabledSkins = cachedConfig.skinOptions
            .filter((s: any) => s.enabled)
            .map((s: any) => s.name);
          setSkinList(enabledSkins);
        }
        if (cachedConfig?.carousels) {
          const enabledCarousels = cachedConfig.carousels
            .filter((c: any) => c.enabled)
            .sort((a: any, b: any) => a.order - b.order);
          setCarousels(enabledCarousels);
        }
      } catch (e) {
        console.error('读取缓存配置失败:', e);
      }

      // 2. 异步从服务器加载最新配置
      const res = await fetch('/api/homepage-config', { cache: 'no-store' });
      const result = await res.json();
      if (result.success) {
        // 加载皮肤列表
        if (result.data?.skinOptions) {
          const enabledSkins = result.data.skinOptions
            .filter((s: any) => s.enabled)
            .map((s: any) => s.name);
          setSkinList(enabledSkins);
        }
        // 加载轮播图
        if (result.data?.carousels) {
          const enabledCarousels = result.data.carousels
            .filter((c: any) => c.enabled)
            .sort((a: any, b: any) => a.order - b.order);
          setCarousels(enabledCarousels);
        }

        // 保存到缓存
        try {
          const cachedConfig = loadConfigFromCache<any>() || {};
          const newConfig = {
            ...cachedConfig,
            ...result.data,
          };
          saveConfigToCache(newConfig);
        } catch (e) {
          console.error('保存配置到缓存失败:', e);
        }
      }
    } catch (error: any) {
      console.error('加载配置失败:', error);
    }
  };

  // 处理发布账号
  const handlePublishAccount = () => {
    if (user) {
      // 已登录，跳转到上架账号页面
      router.push('/seller/accounts/new');
    } else {
      // 未登录，显示登录对话框
      setShowLoginDialog(true);
    }
  };

  // 加载客服配置
  useEffect(() => {
    const loadCustomerServiceConfig = async () => {
      try {
        const res = await fetch('/api/customer-service/config');
        const result = await res.json();
        if (result.success) {
          setCustomerServiceConfig(result.data);
        }
      } catch (error) {
        console.error('加载客服配置失败:', error);
      }
    };

    loadCustomerServiceConfig();
  }, []);

  // 省市数据
  const provinceCityData: Record<string, string[]> = {
    '北京市': ['北京市'],
    '上海市': ['上海市'],
    '天津市': ['天津市'],
    '重庆市': ['重庆市'],
    '河北省': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
    '山西省': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'],
    '内蒙古自治区': ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
    '辽宁省': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
    '吉林省': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
    '黑龙江省': ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],
    '江苏省': ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'],
    '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
    '安徽省': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
    '福建省': ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
    '江西省': ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'],
    '山东省': ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'],
    '河南省': ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'],
    '湖北省': ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州', '仙桃市', '潜江市', '天门市', '神农架林区'],
    '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'],
    '广东省': ['广州市', '韶关市', '深圳市', '珠海市', '汕头市', '佛山市', '江门市', '湛江市', '茂名市', '肇庆市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
    '广西壮族自治区': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
    '海南省': ['海口市', '三亚市', '三沙市', '儋州市', '省直辖县级行政区划'],
    '四川省': ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'],
    '贵州省': ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'],
    '云南省': ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'],
    '西藏自治区': ['拉萨市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区', '日喀则市'],
    '陕西省': ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
    '甘肃省': ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏回族自治州', '甘南藏族自治州'],
    '青海省': ['西宁市', '海东市', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'],
    '宁夏回族自治区': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
    '新疆维吾尔自治区': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区', '石河子市', '阿拉尔市', '图木舒克市', '五家渠市', '北屯市', '铁门关市', '双河市', '可克达拉市', '昆玉市', '胡杨河市'],
    '台湾省': ['台北市', '高雄市', '台南市', '台中市', '新北市', '桃园市', '基隆市', '新竹市', '嘉义市'],
    '香港特别行政区': ['香港岛', '九龙', '新界'],
    '澳门特别行政区': ['澳门半岛', '氹仔', '路环']
  };

  // 加载账号列表
  const loadAccounts = async (signal?: AbortSignal) => {
    setLoadingAccounts(true);
    try {
      const params = new URLSearchParams();
      // 只显示审核通过且可用的账号
      params.append('auditStatus', 'approved');
      params.append('status', 'available');
      params.append('limit', '100');

      const response = await fetch(`/api/accounts?${params.toString()}`, { signal });
      const result = await response.json();

      if (result.success) {
        // 转换API数据为首页需要的格式
        const transformedAccounts = result.data.map((account: any) => {
          const customAttributes = account.customAttributes || {};
          return {
            id: account.id,
            account_id: account.accountId,
            account_name: account.title,
            coins: parseFloat(account.coinsM),
            coins_display: `${account.coinsM}M`,
            safebox: account.safeboxCount === 4 ? '2×2' : account.safeboxCount === 6 ? '2×3' : account.safeboxCount === 9 ? '3×3' : '未知',
            stamina_level: account.staminaValue || 0,
            load_level: account.energyValue || 0,
            account_level: customAttributes.accountLevel || 0,
            rank: customAttributes.rank || '未知',
            kd: parseFloat(customAttributes.kd) || 0,
            awm_bullets: customAttributes.awmBullets || 0,
            awmBullets: customAttributes.awmBullets || 0,
            level_6_armor: customAttributes.level6Armor || 0,
            level6Armor: customAttributes.level6Armor || 0,
            level_6_helmet: customAttributes.level6Helmet || 0,
            level6Helmet: customAttributes.level6Helmet || 0,
            customAttributes: customAttributes,  // 保留完整的customAttributes对象
            region: {
              province: customAttributes.province || '未知',
              city: customAttributes.city || '未知'
            },
            platform: customAttributes.platform || '未知平台',
            login_method: customAttributes.loginMethod === 'qq' ? 'QQ账号密码' :
                          customAttributes.loginMethod === 'qq_scan' ? 'QQ扫码' :
                          customAttributes.loginMethod === 'password' ? 'Steam账号密码' :
                          customAttributes.loginMethod === 'wechat' ? '微信扫码' : '未知',
            available_time: {
              start: customAttributes.startTime || '00:00',
              end: customAttributes.endTime || '24:00'
            },
            actual_rental: parseFloat(account.accountValue) || parseFloat(account.recommendedRental) || 0,
            deposit: parseFloat(account.deposit) || 0,
            total_price: (parseFloat(account.accountValue) || parseFloat(account.recommendedRental) || 0) + (parseFloat(account.deposit) || 0),
            rental_duration: account.rentalDays ? parseFloat(account.rentalDays) : (account.rentalHours ? parseFloat(account.rentalHours) / 24 : 1),
            ratio_display: account.rentalRatio ? `1:${parseFloat(account.rentalRatio).toFixed(0)}` : '1:35',
            tags: account.tags || [],
            skins: account.tags || [],
            images: sanitizeAccountImages(account.screenshots)
          };
        });
        setAccounts(transformedAccounts);
      } else {
        console.error('加载账号失败:', result.error);
        setAccounts([]);
      }
    } catch (error: any) {
      console.error('加载账号失败:', error);
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('加载账号失败:', error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 初始加载账号列表
  useEffect(() => {
    loadAccounts();
  }, []);

  // 模拟账号数据（包含多张图片） - 已废弃，现在使用API数据
  // 实际账号数据已通过useEffect从API加载

  // 筛选账号
  const filteredAccounts = accounts.filter(account => {
    if (searchQuery && !account.account_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.minCoins && account.coins < parseFloat(filters.minCoins)) return false;
    if (filters.maxCoins && account.coins > parseFloat(filters.maxCoins)) return false;
    if (filters.rank !== 'all' && account.rank !== filters.rank) return false;
    if (filters.safebox !== 'all') {
      if (filters.safebox === '1x2' && account.safebox !== '1×2') return false;
      if (filters.safebox === '2x2' && account.safebox !== '2×2') return false;
      if (filters.safebox === '2x3' && account.safebox !== '2×3') return false;
      if (filters.safebox === '3x3' && account.safebox !== '3×3') return false;
    }
    if (filters.staminaLevel !== 'all' && account.stamina_level !== parseInt(filters.staminaLevel)) return false;
    if (filters.loadLevel !== 'all' && account.load_level !== parseInt(filters.loadLevel)) return false;
    // 省市筛选
    if (filters.province !== 'all') {
      if (account.region.province !== filters.province) return false;
      if (filters.city !== 'all' && account.region.city !== filters.city) return false;
    }
    if (filters.minRental && account.actual_rental < parseFloat(filters.minRental)) return false;
    if (filters.maxRental && account.actual_rental > parseFloat(filters.maxRental)) return false;
    if (filters.minDeposit && account.deposit < parseFloat(filters.minDeposit)) return false;
    if (filters.maxDeposit && account.deposit > parseFloat(filters.maxDeposit)) return false;
    if (filters.minTotal && account.total_price < parseFloat(filters.minTotal)) return false;
    if (filters.maxTotal && account.total_price > parseFloat(filters.maxTotal)) return false;
    // 平台和上号方式筛选
    if (filters.platformLogin !== 'all') {
      if (filters.platformLogin === 'wegame-wechat') {
        if (account.login_method !== '微信扫码') return false;
      } else if (filters.platformLogin === 'wegame-qq-scan') {
        if (account.login_method !== 'QQ扫码') return false;
      } else if (filters.platformLogin === 'wegame-qq') {
        if (account.login_method !== 'QQ账号密码') return false;
      } else if (filters.platformLogin === 'steam-password') {
        if (account.login_method !== 'Steam账号密码') return false;
      }
    }
    // 皮肤筛选
    if (filters.skinOptions.length > 0) {
      const accountSkins = account.skins || [];
      const hasSelectedSkin = filters.skinOptions.some(skin => accountSkins.includes(skin));
      if (!hasSelectedSkin) return false;
    }
    return true;
  });

  // 分页
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAccounts = filteredAccounts.slice(startIndex, endIndex);

  // 当过滤条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // 确保currentPage不超过totalPages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - 轮播图 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-purple-50/50 to-white dark:from-indigo-950 dark:via-purple-950/50 dark:to-background py-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="container mx-auto px-4 relative">
          {carousels.length > 0 ? (
            <div className="max-w-6xl mx-auto">
              {/* 轮播图 */}
              <div className="relative overflow-hidden rounded-xl bg-gray-900 aspect-[21/9] md:aspect-[16/9]">
                {carousels.map((carousel, index) => (
                  <div
                    key={carousel.id}
                    className={`absolute inset-0 transition-opacity duration-500 ${index === 0 ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <Link
                      href={normalizeHomepageLinkUrl(carousel.linkUrl, '/')}
                      className="absolute inset-0 z-0"
                      aria-label={carousel.title || '查看轮播图'}
                    />
                    {carousel.imageUrl && (
                      <div className="absolute inset-0 w-full h-full">
                        <Image
                          src={carousel.imageUrl}
                          alt={carousel.title}
                          fill
                          className="object-cover"
                          priority={index === 0} // 第一张图优先加载
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-8 text-white">
                      <h2 className="text-3xl md:text-4xl font-bold mb-2">{carousel.title}</h2>
                      {carousel.description && (
                        <p className="text-lg text-gray-200 mb-4">{carousel.description}</p>
                      )}
                      <Button
                        onClick={handlePublishAccount}
                        className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        发布账号
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <Badge
                className="px-4 py-1 text-sm text-white border-0"
                style={heroGradientStyle}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                专业哈夫币出租平台
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                三角洲行动{' '}
                <span
                  className="text-[#4f46e5] md:text-transparent md:bg-clip-text"
                  style={{
                    ...heroGradientStyle,
                    WebkitBackgroundClip: 'text',
                  }}
                >
                  哈夫币出租
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                安全快捷的哈夫币租赁服务 | 担保交易 | 押金保障 | 安全快捷
              </p>
              <div className="mt-6">
                <Button
                  onClick={handlePublishAccount}
                  className="cursor-pointer text-white font-medium"
                  style={heroGradientStyle}
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  发布账号
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-semibold">筛选账号</h3>
            </div>

            {/* 第一行：上架必填项 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
              {/* 平台与上号方式 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">平台·上号方式</Label>
                <Select onValueChange={(value) => setFilters({...filters, platformLogin: value})} value={filters.platformLogin}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="wegame-wechat">Wegame · 微信扫码</SelectItem>
                    <SelectItem value="wegame-qq-scan">Wegame · QQ扫码</SelectItem>
                    <SelectItem value="wegame-qq">Wegame · QQ账号密码</SelectItem>
                    <SelectItem value="steam-password">Steam · 账号密码</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 哈夫币范围 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">哈夫币(M)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="最小"
                    className="flex-1 text-sm h-9"
                    value={filters.minCoins}
                    onChange={(e) => setFilters({...filters, minCoins: e.target.value})}
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <Input
                    type="number"
                    placeholder="最大"
                    className="flex-1 text-sm h-9"
                    value={filters.maxCoins}
                    onChange={(e) => setFilters({...filters, maxCoins: e.target.value})}
                  />
                </div>
              </div>

              {/* 段位 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">段位</Label>
                <Select onValueChange={(value) => setFilters({...filters, rank: value})} value={filters.rank}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="青铜">青铜</SelectItem>
                    <SelectItem value="白银">白银</SelectItem>
                    <SelectItem value="黄金">黄金</SelectItem>
                    <SelectItem value="铂金">铂金</SelectItem>
                    <SelectItem value="钻石">钻石</SelectItem>
                    <SelectItem value="黑鹰">黑鹰</SelectItem>
                    <SelectItem value="巅峰">巅峰</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 安全箱 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">安全箱</Label>
                <Select onValueChange={(value) => setFilters({...filters, safebox: value})} value={filters.safebox}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1x2">1×2</SelectItem>
                    <SelectItem value="2x2">2×2</SelectItem>
                    <SelectItem value="2x3">2×3</SelectItem>
                    <SelectItem value="3x3">3×3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 体力等级 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">体力等级</Label>
                <Select onValueChange={(value) => setFilters({...filters, staminaLevel: value})} value={filters.staminaLevel}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="3">3级</SelectItem>
                    <SelectItem value="4">4级</SelectItem>
                    <SelectItem value="5">5级</SelectItem>
                    <SelectItem value="6">6级</SelectItem>
                    <SelectItem value="7">7级</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 负重等级 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">负重等级</Label>
                <Select onValueChange={(value) => setFilters({...filters, loadLevel: value})} value={filters.loadLevel}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="3">3级</SelectItem>
                    <SelectItem value="4">4级</SelectItem>
                    <SelectItem value="5">5级</SelectItem>
                    <SelectItem value="6">6级</SelectItem>
                    <SelectItem value="7">7级</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 地区 - Popover二级选择 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">地区</Label>
                <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-start text-left font-normal hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 hover:shadow-sm transition-all duration-300"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {filters.province === 'all' ? '选择地区' : 
                       filters.city === 'all' ? filters.province : 
                       `${filters.province} ${filters.city}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">选择地区</h4>
                    </div>
                    <div className="flex h-[400px]">
                      {/* 左侧：省份列表 */}
                      <ScrollArea className="w-1/2 border-r">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setFilters({...filters, province: 'all', city: 'all'});
                              setRegionPopoverOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              filters.province === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                            }`}
                          >
                            全部地区
                          </button>
                          {Object.keys(provinceCityData).map((province) => (
                            <button
                              key={province}
                              onClick={() => setFilters({...filters, province, city: 'all'})}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                filters.province === province ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                              }`}
                            >
                              {province}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* 右侧：城市列表 */}
                      <ScrollArea className="w-1/2">
                        <div className="p-2">
                          {filters.province === 'all' ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              请先选择省份
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setFilters({...filters, province: filters.province, city: 'all'});
                                  setRegionPopoverOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 ${
                                  filters.city === 'all' ? 'bg-accent' : 'hover:bg-accent'
                                }`}
                              >
                                全部城市
                              </button>
                              {provinceCityData[filters.province]?.map((city) => (
                                <button
                                  key={city}
                                  onClick={() => {
                                    setFilters({...filters, province: filters.province, city});
                                    setRegionPopoverOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    filters.city === city ? 'bg-accent' : 'hover:bg-accent'
                                  }`}
                                >
                                  {city}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 第二行：价格相关 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-4">
              {/* 租金范围 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">租金(元)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="最小"
                    className="flex-1 text-sm h-9"
                    value={filters.minRental}
                    onChange={(e) => setFilters({...filters, minRental: e.target.value})}
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <Input
                    type="number"
                    placeholder="最大"
                    className="flex-1 text-sm h-9"
                    value={filters.maxRental}
                    onChange={(e) => setFilters({...filters, maxRental: e.target.value})}
                  />
                </div>
              </div>

              {/* 押金范围 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">押金(元)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="最小"
                    className="flex-1 text-sm h-9"
                    value={filters.minDeposit}
                    onChange={(e) => setFilters({...filters, minDeposit: e.target.value})}
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <Input
                    type="number"
                    placeholder="最大"
                    className="flex-1 text-sm h-9"
                    value={filters.maxDeposit}
                    onChange={(e) => setFilters({...filters, maxDeposit: e.target.value})}
                  />
                </div>
              </div>

              {/* 总价范围 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">总价(元)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="最小"
                    className="flex-1 text-sm h-9"
                    value={filters.minTotal}
                    onChange={(e) => setFilters({...filters, minTotal: e.target.value})}
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <Input
                    type="number"
                    placeholder="最大"
                    className="flex-1 text-sm h-9"
                    value={filters.maxTotal}
                    onChange={(e) => setFilters({...filters, maxTotal: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* 第三行：搜索和操作按钮 */}
            <div className="flex flex-wrap items-center gap-4">
              {/* 搜索 */}
              <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                <Label className="text-sm font-medium">搜索账号</Label>
                <Input
                  placeholder="输入账号名进行搜索..."
                  className="text-sm h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* 按钮组 */}
              <div className="flex items-center gap-2 self-end mb-1.5">
                <Button
                  variant={showMoreFilters ? "default" : "outline"}
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="h-9 hover:shadow-md transition-all duration-300"
                >
                  {showMoreFilters ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                  {showMoreFilters ? '收起皮肤筛选' : '展开皮肤筛选'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilters({
                      minCoins: '', maxCoins: '', rank: 'all', safebox: 'all',
                      staminaLevel: 'all', loadLevel: 'all', province: 'all', city: 'all',
                      minRental: '', maxRental: '', minDeposit: '', maxDeposit: '',
                      minTotal: '', maxTotal: '', platformLogin: 'all', skinOptions: []
                    });
                    setSearchQuery('');
                  }}
                  className="h-9 hover:bg-orange-50 hover:text-orange-700 hover:shadow-sm transition-all duration-300"
                >
                  重置筛选
                </Button>
              </div>
            </div>
          </div>

          {/* 皮肤筛选器（可折叠） */}
          {showMoreFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="mb-3">
                <Label className="text-sm font-medium">皮肤筛选（可多选）</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {skinList.map((skin) => (
                  <Badge
                    key={skin}
                    variant={filters.skinOptions.includes(skin) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 h-9 px-4 text-sm ${
                      filters.skinOptions.includes(skin)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => {
                      if (filters.skinOptions.includes(skin)) {
                        setFilters({
                          ...filters,
                          skinOptions: filters.skinOptions.filter(s => s !== skin)
                        });
                      } else {
                        setFilters({
                          ...filters,
                          skinOptions: [...filters.skinOptions, skin]
                        });
                      }
                    }}
                  >
                    {filters.skinOptions.includes(skin) && <Check className="w-3 h-3 mr-1" />}
                    {skin}
                  </Badge>
                ))}
              </div>
              {filters.skinOptions.length > 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
                  已选择 {filters.skinOptions.length} 个皮肤
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Account List Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              共 {filteredAccounts.length} 个账号
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentAccounts.length > 0 ? (
              currentAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onDetail={(account) => {
                    setSelectedAccount(account);
                    setShowAccountDetail(true);
                  }}
                />
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">没有找到匹配的账号</h3>
                    <p className="text-sm text-gray-600">
                      {searchQuery || filters.rank !== 'all' || filters.province !== 'all'
                        ? '请尝试调整搜索条件或筛选器'
                        : '暂时没有可用的账号'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({
                        minCoins: '',
                        maxCoins: '',
                        rank: 'all',
                        safebox: 'all',
                        staminaLevel: 'all',
                        loadLevel: 'all',
                        province: 'all',
                        city: 'all',
                        minRental: '',
                        maxRental: '',
                        minDeposit: '',
                        maxDeposit: '',
                        minTotal: '',
                        maxTotal: '',
                        platformLogin: 'all',
                        skinOptions: []
                      });
                    }}
                  >
                    清空筛选条件
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页显示</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
                <span>条</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 hover:shadow-md transition-all duration-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  第 {currentPage} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 hover:shadow-md transition-all duration-300"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 客服悬浮按钮 */}
      <style jsx>{`
        @keyframes bounce-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .customer-bounce:hover {
          animation: bounce-soft 0.5s ease-in-out;
        }
      `}</style>
      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={() => setShowCustomerChat(!showCustomerChat)}
          className="customer-bounce group relative w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center cursor-pointer"
          aria-label="在线客服"
        >
          {/* 按钮图标 */}
          {showCustomerChat ? (
            <X className="w-5 h-5 relative z-10" />
          ) : (
            <MessageCircle className="w-5 h-5 relative z-10" />
          )}

          {/* 未读消息提示 */}
          {!showCustomerChat && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
              1
            </span>
          )}

          {/* 悬停提示气泡 */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-0 translate-y-2">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
              <div className="font-medium">在线客服</div>
              <div className="text-xs text-gray-400">7×24小时为您服务</div>
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-900 mx-auto"></div>
          </div>
        </button>
      </div>

      {/* 客服聊天窗口 */}
      {showCustomerChat && (
        <div className="fixed bottom-24 left-8 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border border-gray-200">
          {/* 聊天窗口头部 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">在线客服</div>
                <div className="text-xs opacity-90">7×24小时在线服务</div>
              </div>
            </div>
            <button
              onClick={() => setShowCustomerChat(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 聊天内容区域 */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-3">
            {/* 客服欢迎消息 */}
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                <div className="text-sm text-gray-700">
                  {customerServiceConfig?.welcomeMessage || '您好！欢迎咨询，请问有什么可以帮到您？'}
                </div>
                <div className="text-xs text-gray-400 mt-1">刚刚</div>
              </div>
            </div>

            {/* 客服二维码 */}
            {customerServiceConfig?.kfQrCode && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                  <div className="text-sm text-gray-700 mb-2">
                    扫码添加客服微信
                  </div>
                  <img
                    src={customerServiceConfig.kfQrCode}
                    alt="客服二维码"
                    className="w-32 h-32 rounded-lg"
                  />
                  <div className="text-xs text-gray-400 mt-1">刚刚</div>
                </div>
              </div>
            )}

            {/* 客服链接按钮 */}
            {customerServiceConfig?.kfUrl && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                  <div className="text-sm text-gray-700 mb-2">
                    点击链接联系客服
                  </div>
                  <a
                    href={customerServiceConfig.kfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    打开企业微信客服
                  </a>
                  <div className="text-xs text-gray-400 mt-1">刚刚</div>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            {!customerServiceConfig?.kfUrl && !customerServiceConfig?.kfQrCode && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">💡 温馨提示</div>
                    <div>企业微信客服系统正在配置中，暂无可用的联系方式。</div>
                    <div className="mt-1 text-xs">请联系管理员配置客服信息。</div>
                  </div>
                </div>
              </div>
            )}

            {/* 常见问题快捷按钮 */}
            {customerServiceConfig?.autoReply && customerServiceConfig.status === 'online' && (
              <div className="flex flex-wrap gap-2 mt-2">
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200 transition-colors">
                  如何租赁账号？
                </button>
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200 transition-colors">
                  如何上架账号？
                </button>
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200 transition-colors">
                  押金如何退还？
                </button>
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200 transition-colors">
                  提现多久到账？
                </button>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="text-xs text-center text-gray-500">
              由企业微信客服系统提供支持
            </div>
          </div>
        </div>
      )}

      {/* 一键跳转最上位置按钮 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer z-50 hover:-translate-y-1"
        aria-label="返回顶部"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <AccountDetailDialog
        open={showAccountDetail}
        onOpenChange={setShowAccountDetail}
        account={selectedAccount}
        isLoggedIn={isLoggedIn}
        isVerified={isVerified}
        onOrder={handleCreateOrder}
        onLoginRequired={handleOrderRequired}
      />

      {/* 登录弹窗 */}
      <LoginDialog
        trigger={null}
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onSuccess={refreshUser}
      />
    </div>
  );
}


