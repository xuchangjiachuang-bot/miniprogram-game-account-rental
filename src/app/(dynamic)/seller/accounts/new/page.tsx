'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info, MapPin, Lock, UserCheck, Clock, MessageCircle, X, Calculator, DollarSign, HelpCircle, Gift, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { loadConfigFromCache, saveConfigToCache, loadSkinsFromCache } from '@/lib/config-sync';
import { useConfigUpdate } from '@/lib/config-sync-manager';
import { getToken } from '@/lib/auth-token';
import { resolvePublicFileReferences } from '@/lib/storage-public';

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

interface PlatformSettings {
  commissionRate: number;
  withdrawalFee: number;
  minRentalPrice: number;
  depositRatio: number;
  coinsPerDay: number;
}

interface CommissionActivity {
  id: string;
  name: string;
  description: string;
  discountRate: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface SkinConfig {
  enabled: boolean;
  skins: string[];
}

const createDefaultFormData = () => ({
  product_type: '\u4e09\u89d2\u6d32\u884c\u52a8\u54c8\u592b\u5e01\u51fa\u79df',
  images: [] as File[],
  imageUrls: [] as string[],
  imageKeys: [] as string[],
  platform: '',
  province: 'all',
  city: 'all',
  login_method: '',
  qq_account: '',
  qq_password: '',
  start_hour: '00',
  end_hour: '23',
  coins_value: '',
  rental_ratio: '',
  deposit: '',
  safebox_type: '',
  stamina_level: '',
  load_level: '',
  account_level: '',
  rank: '',
  kd: '',
  selected_skins: [] as string[],
  awm_bullets: '',
  level6_helmet: '',
  level6_armor: '',
  has_battlepass: false,
  battlepass_level: '',
  remark: '',
  agreement: false,
});

// 小时列表
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// 平台配置（后台可设置）
const PLATFORM_CONFIG = {
  commission_rate: 5, // 平台抽佣比例 5%
  withdrawal_fee: 2   // 提现手续费 2元
};

// 计算建议比例范围
const calculateSuggestedRatio = (safebox: string, stamina: string, coins: string): string => {
  const coinsValue = parseFloat(coins || '0');
  const staminaValue = parseInt(stamina || '0');

  let minRatio = 35;
  let maxRatio = 41;

  // 根据安全箱类型调整
  if (safebox === '2x2') { // 4格保险
    if (staminaValue === 4 || staminaValue === 5) { minRatio = 41; maxRatio = 41; }
    else if (staminaValue === 6) { minRatio = 40; maxRatio = 40; }
    else if (staminaValue === 7) { minRatio = 39; maxRatio = 39; }
  } else if (safebox === '2x3') { // 6格保险
    if (staminaValue === 4 || staminaValue === 5) { minRatio = 39; maxRatio = 39; }
    else if (staminaValue === 6) { minRatio = 38; maxRatio = 38; }
    else if (staminaValue === 7) { minRatio = 37; maxRatio = 37; }
  } else if (safebox === '3x3') { // 9格保险
    if (staminaValue === 4 || staminaValue === 5) { minRatio = 37; maxRatio = 37; }
    else if (staminaValue === 6) { minRatio = 36; maxRatio = 36; }
    else if (staminaValue === 7) { minRatio = 35; maxRatio = 35; }
  }

  // 大额币调整（≥300M比例+1，≥500M比例+2）
  if (coinsValue >= 500) { minRatio += 2; maxRatio += 2; }
  else if (coinsValue >= 300) { minRatio += 1; maxRatio += 1; }

  return `${minRatio}-${maxRatio}`;
};

// 计算租期（10M = 1天）
const calculateRentalPeriod = (coins: string): { days: number; hours: number; text: string } => {
  const coinsValue = parseFloat(coins || '0');
  const days = Math.ceil(coinsValue / 10);
  const totalHours = Math.max(1, days) * 24;
  return {
    days: Math.max(1, days),
    hours: totalHours,
    text: `${Math.max(1, days)}天（${totalHours}小时）`
  };
};

// 计算定价
const calculatePricing = (coins: string, ratio: string, deposit: string, platformSettings: PlatformSettings, activeActivity: CommissionActivity | null) => {
  const coinsValue = parseFloat(coins || '0'); // 单位M
  const ratioValue = parseFloat(ratio || '0');
  const depositValue = parseFloat(deposit || '0');

  if (coinsValue <= 0 || ratioValue <= 0) {
    return null;
  }

  // 账号价值 = 哈夫币数量（转换为个） ÷ 比例
  // 1:35 表示 1元 = 35万哈夫币
  const actualCoins = coinsValue * 1000000; // 转换为哈夫币数量（个）
  const actualRatio = ratioValue * 10000; // 转换为哈夫币数量（35万 = 350,000）
  const accountValue = actualCoins / actualRatio;

  // 计算佣金（考虑优惠活动）
  let commissionRate = platformSettings.commissionRate;
  if (activeActivity && activeActivity.enabled) {
    commissionRate = Math.max(0, commissionRate - activeActivity.discountRate);
  }
  const commission = accountValue * (commissionRate / 100);

  // 卖家收入（账号价值 - 平台抽佣）
  const sellerIncome = accountValue - commission;

  // 提现手续费（从卖家收入中计算，提现时扣除）
  const withdrawalFee = sellerIncome * (platformSettings.withdrawalFee / 100);

  // 最终到账金额（卖家收入 - 提现手续费）
  const finalIncome = sellerIncome - withdrawalFee;

  // 总价（账号价值 + 押金）
  const totalPrice = accountValue + depositValue;

  return {
    accountValue,
    commission,
    commissionRate,
    originalCommissionRate: platformSettings.commissionRate,
    discountRate: activeActivity?.discountRate || 0,
    withdrawalFee,
    withdrawalFeeRate: platformSettings.withdrawalFee,
    sellerIncome,
    finalIncome,
    deposit: depositValue,
    totalPrice,
    rentalOnly: sellerIncome,
    actualCoins,
    actualRatio,
    activityName: activeActivity?.name || null
  };
};

function NewAccountPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('id'); // 从URL获取账号ID，如果是编辑模式

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 是否为编辑模式
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 平台设置
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    commissionRate: 5,
    withdrawalFee: 1,
    minRentalPrice: 50,
    depositRatio: 50,
    coinsPerDay: 10
  });
  const [activeActivity, setActiveActivity] = useState<CommissionActivity | null>(null);
  const [skinConfig, setSkinConfig] = useState<SkinConfig>({
    enabled: false,
    skins: []
  });

  const [formData, setFormData] = useState({
    // 基本信息
    product_type: '三角洲行动哈夫币出租',
    images: [] as File[],
    imageUrls: [] as string[],
    imageKeys: [] as string[],
    platform: '', // 平台选择：wegame、steam
    province: 'all',
    city: 'all',
    login_method: '',
    qq_account: '',
    qq_password: '',
    start_hour: '00',
    end_hour: '23',

    // 哈夫币信息
    coins_value: '', // 单位M，1M=100万
    rental_ratio: '', // 出租比例
    deposit: '', // 押金

    // 账号属性
    safebox_type: '',
    stamina_level: '',
    load_level: '',
    account_level: '',
    rank: '',
    kd: '',

    // 皮肤
    selected_skins: [] as string[],

    // 游戏道具
    awm_bullets: '',
    level6_helmet: '',
    level6_armor: '',
    has_battlepass: false,
    battlepass_level: '',

    // 备注
    remark: '',

    // 协议
    agreement: false
  });

  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [startHourPopoverOpen, setStartHourPopoverOpen] = useState(false);
  const [endHourPopoverOpen, setEndHourPopoverOpen] = useState(false);
  const [agreements, setAgreements] = useState<Record<string, { title: string; content: string; enabled: boolean }>>({});
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);

  // 检查用户认证状态
  useEffect(() => {
    if (!userLoading && user) {
      setIsAuthenticated(true);
      setIsVerified(user.isRealNameVerified || false);

      // 如果未实名认证，显示提示
      if (!user.isRealNameVerified) {
        setShowAuthAlert(true);
      }
    } else if (!userLoading && !user) {
      setIsAuthenticated(false);
      setIsVerified(false);
      setShowAuthAlert(true);
    }
  }, [user, userLoading]);

  // 加载账号数据（编辑模式）
  useEffect(() => {
    if (accountId) {
      setIsEditMode(true);
      loadAccountData(accountId);
    }
  }, [accountId]);

  // 加载平台设置和优惠活动
  useEffect(() => {
    if (!isEditMode) {
      void loadData();
    }

    // 监听配置更新（通过 SSE）
    const handleConfigUpdate = () => {
      if (!isEditMode) {
        void loadData({ silent: true });
      }
    };

    // 监听自定义配置更新事件
    window.addEventListener('config-update', handleConfigUpdate);

    return () => {
      window.removeEventListener('config-update', handleConfigUpdate);
    };
  }, [isEditMode]);

  // 监听皮肤配置更新
  useConfigUpdate('skin', (event) => {
    console.log('账号发布页收到皮肤配置更新:', event);
    loadSkinConfig();
  }, []);

  // 监听配置更新
  useConfigUpdate('all', (event) => {
    console.log('账号发布页收到配置更新:', event);
    loadAgreements();
  }, []);

  // 监听平台配置更新
  useConfigUpdate('settings', (event) => {
    console.log('账号发布页收到平台配置更新:', event);
    void loadData({ silent: true });
  }, []);


  // 加载账号数据
  const loadAccountData = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}`);
      if (!response.ok) {
        throw new Error('加载账号数据失败');
      }
      const result = await response.json();
      if (result.success) {
        const account = result.data;
        const customAttributes = account.customAttributes || {};

        // 填充表单数据
          setFormData({
            ...createDefaultFormData(),
            agreement: formData.agreement,
          platform: customAttributes.platform || '',
          province: customAttributes.province || 'all',
          city: customAttributes.city || 'all',
          login_method: customAttributes.loginMethod || '',
          qq_account: customAttributes.qqAccount || '',
          qq_password: customAttributes.qqPassword || '',
          coins_value: account.coinsM || '',
          rental_ratio: account.rentalRatio || '',
          deposit: account.deposit || '',
          safebox_type: account.safeboxCount === 4 ? '2x2' : account.safeboxCount === 6 ? '2x3' : '3x3',
          stamina_level: account.staminaValue?.toString() || '',
          load_level: account.energyValue?.toString() || '',
          account_level: customAttributes.accountLevel || '',
          rank: customAttributes.rank || '',
          kd: customAttributes.kd || '',
          selected_skins: account.tags || [],
          awm_bullets: customAttributes.awmBullets || '',
          level6_helmet: customAttributes.level6Helmet || '',
          level6_armor: customAttributes.level6Armor || '',
          remark: customAttributes.remark || '',
            start_hour: customAttributes.startTime || '00',
            end_hour: customAttributes.endTime || '23',
            imageUrls: resolvePublicFileReferences(account.screenshots),
            imageKeys: account.screenshots || []
          });
      }
    } catch (error) {
      console.error('加载账号数据失败:', error);
      alert('加载账号数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 表单验证函数
  const validateForm = (): { isValid: boolean; error?: string; field?: string } => {
    // 验证必填字段
    if (!isEditMode && formData.images.length === 0) {
      return { isValid: false, error: '请至少上传一张图片', field: 'images' };
    }

    if (!formData.platform) {
      return { isValid: false, error: '请选择账号平台', field: 'platform' };
    }

    if (formData.province === 'all' || formData.city === 'all') {
      return { isValid: false, error: '请选择地区', field: 'location' };
    }

    if (!formData.login_method) {
      return { isValid: false, error: '请选择上号方式', field: 'login_method' };
    }

    // 验证QQ/Steam账号密码
    if ((formData.login_method === 'qq' || formData.login_method === 'password')) {
      if (!formData.qq_account?.trim()) {
        return { isValid: false, error: `${formData.login_method === 'qq' ? 'QQ' : 'Steam'}账号不能为空`, field: 'qq_account' };
      }
      if (!formData.qq_password?.trim()) {
        return { isValid: false, error: `${formData.login_method === 'qq' ? 'QQ' : 'Steam'}密码不能为空`, field: 'qq_password' };
      }
    }

    // 验证哈夫币数量
    if (!formData.coins_value?.trim()) {
      return { isValid: false, error: '请填写哈夫币数量', field: 'coins_value' };
    }
    const coinsValue = parseFloat(formData.coins_value);
    if (isNaN(coinsValue) || coinsValue <= 0) {
      return { isValid: false, error: '哈夫币数量必须是大于0的数字', field: 'coins_value' };
    }
    if (coinsValue > 10000) {
      return { isValid: false, error: '哈夫币数量不能超过10000M', field: 'coins_value' };
    }

    // 验证出租比例
    if (!formData.rental_ratio?.trim()) {
      return { isValid: false, error: '请填写出租比例', field: 'rental_ratio' };
    }
    const ratioValue = parseFloat(formData.rental_ratio);
    if (isNaN(ratioValue) || ratioValue <= 0) {
      return { isValid: false, error: '出租比例必须是大于0的数字', field: 'rental_ratio' };
    }
    if (ratioValue > 1000) {
      return { isValid: false, error: '出租比例不能超过1000', field: 'rental_ratio' };
    }

    // 验证押金金额
    if (!formData.deposit?.trim()) {
      return { isValid: false, error: '请填写押金金额', field: 'deposit' };
    }
    const depositValue = parseFloat(formData.deposit);
    if (isNaN(depositValue) || depositValue < 0) {
      return { isValid: false, error: '押金金额必须是大于等于0的数字', field: 'deposit' };
    }

    // 验证账号属性
    if (!formData.safebox_type) {
      return { isValid: false, error: '请选择安全箱类型', field: 'safebox_type' };
    }

    if (!formData.stamina_level?.trim()) {
      return { isValid: false, error: '请填写体力等级', field: 'stamina_level' };
    }
    const staminaValue = parseInt(formData.stamina_level);
    if (isNaN(staminaValue) || staminaValue < 1 || staminaValue > 15) {
      return { isValid: false, error: '体力等级必须是1-15之间的整数', field: 'stamina_level' };
    }

    if (!formData.load_level?.trim()) {
      return { isValid: false, error: '请填写负重等级', field: 'load_level' };
    }
    const loadValue = parseInt(formData.load_level);
    if (isNaN(loadValue) || loadValue < 1 || loadValue > 15) {
      return { isValid: false, error: '负重等级必须是1-15之间的整数', field: 'load_level' };
    }

    if (!formData.account_level?.trim()) {
      return { isValid: false, error: '请填写账号等级', field: 'account_level' };
    }
    const accountLevelValue = parseInt(formData.account_level, 10);
    if (isNaN(accountLevelValue) || accountLevelValue < 1 || accountLevelValue > 60) {
      return { isValid: false, error: '账号等级必须是1-60之间的整数', field: 'account_level' };
    }

    // 验证备注长度
    if (formData.remark && formData.remark.length > 200) {
      return { isValid: false, error: '备注不能超过200字', field: 'remark' };
    }

    return { isValid: true };
  };

  const loadData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      // 1. 优先从缓存加载配置（秒级）
      const cachedConfig = loadConfigFromCache<any>();
      if (cachedConfig?.platformSettings) {
        setPlatformSettings(cachedConfig.platformSettings);
      }
      if (cachedConfig?.activeActivity) {
        setActiveActivity(cachedConfig.activeActivity);
      }

      // 加载皮肤配置（从缓存）
      loadSkinConfig();

      // 加载协议配置
      loadAgreements();

      // 2. 异步从服务器加载最新配置
      const [settingsRes, activitiesRes] = await Promise.all([
        fetch('/api/admin/platform-settings'),
        fetch('/api/admin/commission-activities?active=true')
      ]);

      // 加载平台设置
      if (settingsRes.ok) {
        const result = await settingsRes.json();
        if (result.success) {
          setPlatformSettings(result.data);
        }
      }

      // 加载优惠活动
      if (activitiesRes.ok) {
        const result = await activitiesRes.json();
        if (result.success) {
          const now = new Date();
          const active = result.data.find((activity: CommissionActivity) =>
            activity.enabled &&
            new Date(activity.startTime) <= now &&
            new Date(activity.endTime) >= now
          );
          setActiveActivity(active || null);
        }
      }

      // 保存到缓存
      try {
        const newConfig = {
          ...cachedConfig,
          platformSettings,
          activeActivity,
        };
        saveConfigToCache(newConfig);
      } catch (e) {
        console.error('保存配置到缓存失败:', e);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadSkinConfig = () => {
    // 优先从缓存加载皮肤配置
    try {
      const cachedConfig = loadConfigFromCache<any>();
      if (cachedConfig?.skinOptions) {
        const enabledSkins = cachedConfig.skinOptions
          .filter((s: any) => s.enabled)
          .map((s: any) => s.name);
        if (enabledSkins.length > 0) {
          setSkinConfig({
            enabled: true,
            skins: enabledSkins
          });
        } else {
          setSkinConfig({
            enabled: false,
            skins: []
          });
        }
      }
    } catch (e) {
      console.error('读取缓存皮肤配置失败:', e);
    }
  };

  // 加载协议内容
  const loadAgreements = async () => {
    try {
      const response = await fetch('/api/admin/agreements', {
        cache: 'no-store',
      });
      if (!response.ok) {
        console.error('加载协议失败:', response.status);
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        const agreementsMap: Record<string, { title: string; content: string; enabled: boolean }> = {};
        result.data.forEach((agreement: any) => {
          if (agreement.enabled !== false) {
            agreementsMap[agreement.key] = {
              title: agreement.title,
              content: agreement.content,
              enabled: agreement.enabled
            };
          }
        });
        setAgreements(agreementsMap);
      }
    } catch (error) {
      console.error('加载协议失败:', error);
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      e.target.value = '';
      return;
    }

    if (files.length + formData.imageUrls.length > 9) {
      alert('最多只能上传9张图片');
      return;
    }

    try {
      const token = getToken();
      const uploadedImages: { key: string; url: string; file: File }[] = [];

      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', 'screenshot');

        const response = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: uploadFormData,
        });

        const result = await response.json();
        if (!response.ok || !result.success || !result.key || !result.url) {
          throw new Error(result.error || '鍥剧墖涓婁紶澶辫触');
        }

        uploadedImages.push({
          key: result.key,
          url: result.url,
          file,
        });
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedImages.map((item) => item.file)],
        imageUrls: [...prev.imageUrls, ...uploadedImages.map((item) => item.url)],
        imageKeys: [...prev.imageKeys, ...uploadedImages.map((item) => item.key)],
      }));
      e.target.value = '';
    } catch (error) {
      console.error('鍥剧墖涓婁紶澶辫触:', error);
      alert(error instanceof Error ? error.message : '鍥剧墖涓婁紶澶辫触');
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newUrls = formData.imageUrls.filter((_, i) => i !== index);
    const newKeys = formData.imageKeys.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: newImages,
      imageUrls: newUrls,
      imageKeys: newKeys
    });
  };

  // 切换皮肤选择
  const toggleSkin = (skin: string) => {
    if (formData.selected_skins.includes(skin)) {
      setFormData({
        ...formData,
        selected_skins: formData.selected_skins.filter(s => s !== skin)
      });
    } else {
      setFormData({
        ...formData,
        selected_skins: [...formData.selected_skins, skin]
      });
    }
  };

  // 提交上架
  const handleSubmit = async () => {
    if (!isAuthenticated || !isVerified) {
      setShowAuthDialog(true);
      return;
    }

    // 统一表单验证
    const validation = validateForm();
    if (!validation.isValid) {
      alert(validation.error || '表单验证失败');
      // 滚动到错误字段
      if (validation.field) {
        const element = document.querySelector(`[data-field="${validation.field}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      setSubmitting(false);
      return;
    }

    // 显示加载中
    const confirmMessage = isEditMode
      ? '确认保存账号信息吗？\n\n修改后系统会按当前审核配置重新处理账号状态。'
      : '确认提交账号上架吗？\n\n注意：\n1. 提交后将自动冻结上架保证金（可在后台配置金额）\n2. 账号会按当前平台审核配置自动上架或进入待审核\n3. 待审核中的账号不会对外展示\n4. 审核被拒绝时保证金会自动退还';

    const confirmSubmit = confirm(confirmMessage);

    if (!confirmSubmit) {
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      // 检查用户登录状态
      if (!user) {
        alert('请先登录');
        window.location.href = '/';
        setSubmitting(false);
        return;
      }

      const userId = user.id;

      // 计算定价信息
      console.log('开始计算定价...', {
        coins: formData.coins_value,
        ratio: formData.rental_ratio,
        deposit: formData.deposit
      });

      const pricing = calculatePricing(formData.coins_value, formData.rental_ratio, formData.deposit, platformSettings, activeActivity);

      console.log('定价计算结果:', pricing);

      if (!pricing) {
        alert('计算定价失败，请检查哈夫币数量和出租比例是否填写正确');
        setSubmitting(false);
        return;
      }

      // 生成格式化的账号标题
      const safeboxType = formData.safebox_type === '2x2' ? '2x2' : formData.safebox_type === '2x3' ? '2x3' : '3x3';
      const safeboxCount = formData.safebox_type === '2x2' ? 4 : formData.safebox_type === '2x3' ? 6 : 9;
      const safeboxLabel = safeboxCount === 9 ? '顶级安全箱' : `${safeboxCount}格安全箱`;

      const titleParts = [];

      // 哈夫币数量
      titleParts.push(`哈夫币${formData.coins_value}M`);

      // 安全箱
      titleParts.push(`${safeboxLabel}(${safeboxType})`);

      // 体力等级
      titleParts.push(`${formData.stamina_level}体力`);

      // 负重等级
      titleParts.push(`${formData.load_level}负重`);

      // 段位（从rank字段获取）
      if (formData.rank && formData.rank !== 'unranked') {
        titleParts.push(formData.rank);
      }

      // 皮肤信息
      if (formData.selected_skins.length > 0) {
        // 获取皮肤段位
        const skinRanks = ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '王者'];
        const skinRank = formData.selected_skins.find((s: string) => skinRanks.includes(s));
        if (skinRank) titleParts.push(skinRank);

        // 添加皮肤数量和具体皮肤
        const skinDetails = formData.selected_skins.filter((s: string) => !skinRanks.includes(s));
        if (skinDetails.length > 0) titleParts.push(skinDetails.join(' '));
        if (formData.selected_skins.length > 0) titleParts.push(`${formData.selected_skins.length}个皮肤`);
      }

      // 战斗通行证
      if (formData.has_battlepass) {
        titleParts.push(`BP${formData.battlepass_level}级`);
      }

      const generatedTitle = titleParts.join('  |  ') + '  |  ';

      // 准备提交数据
      const submitData = {
        sellerId: userId,
        accountId: isEditMode ? undefined : `${formData.platform}_${formData.province}_${formData.city}_${Date.now()}`, // 生成唯一账号ID（仅创建模式）
        title: generatedTitle,
        description: formData.remark,
          screenshots: formData.imageKeys,
        coinsM: parseFloat(formData.coins_value),
        safeboxCount: formData.safebox_type === '2x2' ? 4 : formData.safebox_type === '2x3' ? 6 : 9,
        energyValue: parseInt(formData.load_level || '0'),
        staminaValue: parseInt(formData.stamina_level || '0'),
        hasSkins: formData.selected_skins.length > 0,
        skinTier: formData.selected_skins.length > 0 ? formData.selected_skins.join(',') : null,
        skinCount: formData.selected_skins.length,
        hasBattlepass: formData.has_battlepass || false,
        battlepassLevel: parseInt(formData.battlepass_level || '0'),
        customAttributes: {
          platform: formData.platform,
          loginMethod: formData.login_method,
          qqAccount: formData.qq_account,
          qqPassword: formData.qq_password,
          province: formData.province,
          city: formData.city,
          awmBullets: formData.awm_bullets,
          level6Helmet: formData.level6_helmet,
          level6Armor: formData.level6_armor,
          remark: formData.remark,
          accountLevel: formData.account_level,
          rank: formData.rank,
          kd: formData.kd,
          startTime: formData.start_hour,
          endTime: formData.end_hour
        },
        tags: formData.selected_skins,
        accountValue: pricing.accountValue,
        recommendedRental: pricing.accountValue,
        rentalRatio: parseFloat(formData.rental_ratio),
        deposit: pricing.deposit,
        totalPrice: pricing.totalPrice,
        rentalDays: calculateRentalPeriod(formData.coins_value).days,
        rentalHours: calculateRentalPeriod(formData.coins_value).hours,
        rentalDescription: calculateRentalPeriod(formData.coins_value).text
      };

      // 提交到后端
      const url = isEditMode ? `/api/accounts/${accountId}` : '/api/accounts';
      const method = isEditMode ? 'PUT' : 'POST';
      console.log('准备提交到后端...', { url, method, isEditMode });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      console.log('后端响应状态:', response.status);

      const result = await response.json();

      console.log('后端响应数据:', result);

      if (result.success) {
        const auditStatus = result.data?.account?.auditStatus;
        const isApproved = auditStatus === 'approved';
        const successMessage = isEditMode
          ? `账号修改成功！\n\n${isApproved ? '账号已按当前审核配置通过并保持上架。' : '账号已保存，当前处于待审核状态，审核通过后会上架。'}`
          : `账号提交成功！\n\n${isApproved ? '账号已通过审核并上架，可在账号列表中查看。' : '账号已提交，当前处于待审核状态，审核通过后会自动上架。'}\n\n保证金金额：￥${result.data.deposit?.amount ?? 0}\n账号ID：${result.data.account.id}`;

        alert(successMessage);
        // 跳转到账号列表页
        window.location.href = '/seller/accounts';
      } else {
        alert(`${isEditMode ? '账号修改' : '账号提交'}失败：${result.error}`);
      }
    } catch (error: any) {
      console.error(`${isEditMode ? '修改' : '提交'}账号失败:`, error);
      alert(`${isEditMode ? '修改' : '提交'}账号失败：${error.message || '网络错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 显示认证对话框
  if (showAuthDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              身份验证
            </CardTitle>
            <CardDescription>
              上架账号需要先完成登录和实名认证
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              {!isAuthenticated ? (
                <>
                  <Lock className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">未登录</p>
                    <p className="text-sm text-muted-foreground">请先登录您的账号</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium">已登录</p>
                    <p className="text-sm text-muted-foreground">账号已认证</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              {!isVerified ? (
                <>
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="font-medium">未实名认证</p>
                    <p className="text-sm text-muted-foreground">请完成实名认证后再上架账号</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium">已实名认证</p>
                    <p className="text-sm text-muted-foreground">可以正常上架账号</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAuthDialog(false)}
                className="flex-1"
              >
                {'\u6211\u7684\u8d26\u53f7'}
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                去登录/认证
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rentalPeriod = calculateRentalPeriod(formData.coins_value);
  const pricing = calculatePricing(formData.coins_value, formData.rental_ratio, formData.deposit, platformSettings, activeActivity);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/seller/accounts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {'\u6211\u7684\u8d26\u53f7'}
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium">{isEditMode ? '\u7f16\u8f91\u8d26\u53f7' : '\u4e0a\u67b6\u8d26\u53f7'}</span>
          </div>

          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isEditMode ? '编辑账号信息' : '上架新账号'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isEditMode
                ? '修改账号信息后，账号将重新进入待审核状态'
                : '填写账号信息，审核通过后将上架到平台'}
            </p>
          </div>

          {/* 认证状态提示 */}
          {showAuthAlert && (
            <div className={`mb-6 p-4 rounded-lg border ${
              !isAuthenticated ? 'bg-yellow-50 border-yellow-200' :
              !isVerified ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                {!isAuthenticated ? (
                  <>
                    <Lock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900 mb-1">未登录</p>
                      <p className="text-sm text-yellow-700 mb-2">请先登录您的账号后再上架账号</p>
                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/'}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        去登录
                      </Button>
                    </div>
                  </>
                ) : !isVerified ? (
                  <>
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900 mb-1">未实名认证</p>
                      <p className="text-sm text-yellow-700 mb-2">为了保障交易安全，上架账号前需要完成实名认证</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setShowAuthAlert(false)}
                          variant="outline"
                        >
                          稍后认证
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.location.href = '/user-center?tab=verification'}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          立即认证
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息 <span className="text-sm font-normal text-muted-foreground ml-2">填写账号的基本信息</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 商品类型 */}
                <div>
                  <Label className="text-sm">商品类型</Label>
                  <Input value={formData.product_type} disabled className="mt-1.5" />
                </div>

                {/* 上传图片 */}
                <div>
                  <Label className="text-sm">上传图片（最多9张）</Label>
                  <div
                    className="mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">点击上传图片</p>
                    <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式，每张不超过 5MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* 已上传的图片 */}
                  {formData.imageUrls.length > 0 && (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {formData.imageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                          <img
                            src={url}
                            alt={`上传图片${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 地区选择 */}
                <div>
                  <Label className="text-sm">地区 *</Label>
                  <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1.5 justify-start text-left font-normal hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 hover:shadow-sm transition-all duration-300 relative z-10"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        {formData.province === 'all' ? '选择地区' :
                         formData.city === 'all' ? formData.province :
                         `${formData.province} ${formData.city}`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 z-[100]" align="start" sideOffset={8}>
                      <div className="p-3 border-b">
                        <h4 className="font-medium text-sm">选择地区</h4>
                      </div>
                      <div className="flex h-[350px]">
                        <ScrollArea className="w-1/2 border-r">
                          <div className="p-1">
                            <button
                              onClick={() => setFormData({...formData, province: 'all', city: 'all'})}
                              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                                formData.province === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                              }`}
                            >
                              全部地区
                            </button>
                            {Object.keys(provinceCityData).map((province) => (
                              <button
                                key={province}
                                onClick={() => setFormData({...formData, province, city: 'all'})}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                                  formData.province === province ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                                }`}
                              >
                                {province}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                        <ScrollArea className="w-1/2">
                          <div className="p-1">
                            {formData.province === 'all' ? (
                              <div className="px-2.5 py-1.5 text-xs text-muted-foreground">
                                请先选择省份
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setFormData({...formData, province: formData.province, city: 'all'});
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors mb-0.5 ${
                                    formData.city === 'all' ? 'bg-accent' : 'hover:bg-accent'
                                  }`}
                                >
                                  全部城市
                                </button>
                                {provinceCityData[formData.province]?.map((city) => (
                                  <button
                                    key={city}
                                    onClick={() => {
                                      setFormData({...formData, province: formData.province, city});
                                      setRegionPopoverOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                                      formData.city === city ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
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

                {/* 平台选择 */}
                <div>
                  <Label className="text-sm">账号平台 *</Label>
                  <div className="flex gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, platform: 'wegame', login_method: ''})}
                      className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                        formData.platform === 'wegame'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <div>
                          <div className="font-medium text-sm">Wegame</div>
                          <div className="text-xs text-gray-500">支持微信扫码、QQ扫码和QQ账号密码</div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, platform: 'steam', login_method: ''})}
                      className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                        formData.platform === 'steam'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <div>
                          <div className="font-medium text-sm">Steam</div>
                          <div className="text-xs text-gray-500">只支持账号密码登录</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 上号方式 */}
                <div data-field="login_method">
                  <Label className="text-sm">上号方式 *</Label>
                  <Select value={formData.login_method} onValueChange={(value) => setFormData({...formData, login_method: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="选择上号方式" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.platform === 'wegame' ? (
                        <>
                          <SelectItem value="qq">QQ账号密码</SelectItem>
                          <SelectItem value="qq_scan">QQ扫码</SelectItem>
                          <SelectItem value="wechat">微信扫码</SelectItem>
                        </>
                      ) : formData.platform === 'steam' ? (
                        <SelectItem value="password">Steam账号密码</SelectItem>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          请先选择账号平台
                        </div>
                      )}
                    </SelectContent>
                  </Select>

                  {/* 账号密码输入框 */}
                  {(formData.login_method === 'qq' || formData.login_method === 'password') && (
                    <div className="mt-3 space-y-2 p-3 bg-muted rounded-lg">
                      <div>
                        <Label className="text-xs">
                          {formData.login_method === 'qq' ? 'QQ账号' : 'Steam账号'} *
                        </Label>
                        <Input
                          type="text"
                          placeholder={formData.login_method === 'qq' ? '请输入QQ账号' : '请输入Steam账号'}
                          value={formData.qq_account}
                          onChange={(e) => setFormData({...formData, qq_account: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {formData.login_method === 'qq' ? 'QQ密码' : 'Steam密码'} *
                        </Label>
                        <Input
                          type="password"
                          placeholder={formData.login_method === 'qq' ? '请输入QQ密码' : '请输入Steam密码'}
                          value={formData.qq_password}
                          onChange={(e) => setFormData({...formData, qq_password: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* 扫码登录说明 */}
                  {(formData.login_method === 'wechat' || formData.login_method === 'qq_scan') && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium">扫码登录说明</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            买家下单后，系统会自动创建群聊，方便您和买家沟通上号与交易流程。请按订单页提供的方式完成扫码登录。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 方便上号时间 - 轮盘选择器 */}
                <div>
                  <Label className="text-sm">方便上号时间 *</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    {/* 开始时间 */}
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1.5">开始时间</div>
                      <Popover open={startHourPopoverOpen} onOpenChange={setStartHourPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-14 text-xl font-bold relative z-10"
                          >
                            {formData.start_hour}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0 z-[100]" align="start" sideOffset={8}>
                          <div className="p-3 border-b">
                            <h4 className="font-medium text-xs">选择开始时间</h4>
                          </div>
                          <ScrollArea className="h-56">
                            <div className="p-1.5 grid grid-cols-4 gap-1.5">
                              {hours.map((hour) => (
                                <button
                                  key={hour}
                                  onClick={() => {
                                    setFormData({...formData, start_hour: hour});
                                    setStartHourPopoverOpen(false);
                                  }}
                                  className={`h-10 rounded flex items-center justify-center text-base font-bold transition-all ${
                                    formData.start_hour === hour
                                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                      : 'bg-muted hover:bg-accent'
                                  }`}
                                >
                                  {hour}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="text-xl font-bold text-muted-foreground pt-5">-</div>

                    {/* 结束时间 */}
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1.5">结束时间</div>
                      <Popover open={endHourPopoverOpen} onOpenChange={setEndHourPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-14 text-xl font-bold relative z-10"
                          >
                            {formData.end_hour}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0 z-[100]" align="start" sideOffset={8}>
                          <div className="p-3 border-b">
                            <h4 className="font-medium text-xs">选择结束时间</h4>
                          </div>
                          <ScrollArea className="h-56">
                            <div className="p-1.5 grid grid-cols-4 gap-1.5">
                              {hours.map((hour) => (
                                <button
                                  key={hour}
                                  onClick={() => {
                                    setFormData({...formData, end_hour: hour});
                                    setEndHourPopoverOpen(false);
                                  }}
                                  className={`h-10 rounded flex items-center justify-center text-base font-bold transition-all ${
                                    formData.end_hour === hour
                                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                      : 'bg-muted hover:bg-accent'
                                  }`}
                                >
                                  {hour}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 哈夫币信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">哈夫币信息 <span className="text-sm font-normal text-muted-foreground ml-2">单位M，1M=100万哈夫币</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">哈夫币余额（M） *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.5"
                      value={formData.coins_value}
                      onChange={(e) => setFormData({...formData, coins_value: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">出租比例（1人民币：多少万哈夫币） *</Label>
                    <Input
                      type="number"
                      step="1"
                      min="30"
                      max="50"
                      placeholder="37"
                      value={formData.rental_ratio}
                      onChange={(e) => setFormData({...formData, rental_ratio: e.target.value})}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">推荐比例1：40左右</p>
                  </div>
                </div>

                {/* 建议比例 */}
                {false && (
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-purple-900">
                        <>{'\u7ecf\u9a8c\u53c2\u8003\u533a\u95f4'}</>
                      </span>
                    </div>
                  </div>
                )}

                {/* 押金和租期 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm">押金金额（元） *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">押金是买家下单时需要支付的行为保证金。租赁结束后，如买家正常使用，押金将全额退还；如出现违规行为，押金将用于赔付卖家。</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      step="10"
                      placeholder="0-10000"
                      value={formData.deposit}
                      onChange={(e) => setFormData({...formData, deposit: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">自动计算租期（10M = 1天）</div>
                      <div className="text-sm font-bold text-purple-600 mt-1">{rentalPeriod.text}</div>
                    </div>
                  </div>
                </div>

                {/* 定价预览 */}
                {pricing && (
                  <>
                    {/* 优惠活动提示 */}
                    {pricing.activityName && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-900">
                            优惠活动中：{pricing.activityName}
                          </span>
                        </div>
                        <div className="text-xs text-green-700 space-y-1">
                          <div className="flex justify-between">
                            <span>原佣金比例</span>
                            <span className="font-semibold">{pricing.originalCommissionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>减免佣金点数</span>
                            <span className="font-semibold">-{pricing.discountRate}%</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>活动佣金</span>
                            <span className="text-green-600">{pricing.commissionRate}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-100 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">定价预览</span>
                      </div>

                      {/* 核心信息展示 */}
                      <div className="space-y-3">
                        {/* 账号租金 */}
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-purple-100">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">账号租金</div>
                            <div className="text-lg font-bold text-gray-900">¥{pricing.accountValue.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">租期</div>
                            <div className="text-sm font-semibold text-purple-600">{calculateRentalPeriod(formData.coins_value).text}</div>
                          </div>
                        </div>

                        {/* 可提现收入 - 突出显示 */}
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg border-2 border-green-300">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-green-800 mb-1">预计到账</div>
                            <div className="text-2xl font-bold text-green-700">¥{pricing.finalIncome.toFixed(2)}</div>
                            <div className="mt-1 text-xs text-green-700">
                              已扣除平台抽佣 ¥{pricing.commission.toFixed(2)} 和提现费 ¥{pricing.withdrawalFee.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right text-xs text-green-700">
                            <div>平台抽佣 {pricing.commissionRate}%</div>
                            <div>提现费 {pricing.withdrawalFeeRate}%</div>
                          </div>
                        </div>

                        {/* 买家支付 */}
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-purple-100">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">买家支付</div>
                            <div className="text-lg font-bold text-gray-900">¥{pricing.totalPrice.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">含押金 ¥{pricing.deposit.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 账号属性 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">账号属性 <span className="text-sm font-normal text-muted-foreground ml-2">填写账号的详细属性</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* 安全箱 */}
                  <div>
                    <Label className="text-sm">安全箱 *</Label>
                    <Select value={formData.safebox_type} onValueChange={(value) => setFormData({...formData, safebox_type: value})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="选择安全箱类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2x2">2×2（4格保险）</SelectItem>
                        <SelectItem value="2x3">2×3（6格保险）</SelectItem>
                        <SelectItem value="3x3">3×3（9格保险）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 体力等级 */}
                  <div>
                    <Label className="text-sm">体力等级 *</Label>
                    <Select value={formData.stamina_level} onValueChange={(value) => setFormData({...formData, stamina_level: value})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="选择体力等级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4级</SelectItem>
                        <SelectItem value="5">5级</SelectItem>
                        <SelectItem value="6">6级</SelectItem>
                        <SelectItem value="7">7级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 负重等级 */}
                  <div>
                    <Label className="text-sm">负重等级 *</Label>
                    <Select value={formData.load_level} onValueChange={(value) => setFormData({...formData, load_level: value})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="选择负重等级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4级</SelectItem>
                        <SelectItem value="5">5级</SelectItem>
                        <SelectItem value="6">6级</SelectItem>
                        <SelectItem value="7">7级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 账号等级 */}
                  <div data-field="account_level">
                    <Label className="text-sm">账号等级 *</Label>
                    <Input
                      type="number"
                      placeholder="1-60"
                      min="1"
                      max="60"
                      value={formData.account_level}
                      onChange={(e) => setFormData({...formData, account_level: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>

                  {/* 账号段位 */}
                  <div>
                    <Label className="text-sm">账号段位 *</Label>
                    <Select value={formData.rank} onValueChange={(value) => setFormData({...formData, rank: value})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="选择账号段位" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="bronze">青铜</SelectItem>
                        <SelectItem value="silver">白银</SelectItem>
                        <SelectItem value="gold">黄金</SelectItem>
                        <SelectItem value="platinum">铂金</SelectItem>
                        <SelectItem value="diamond">钻石</SelectItem>
                        <SelectItem value="blackeagle">黑鹰</SelectItem>
                        <SelectItem value="peak">巅峰</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 绝密KD */}
                  <div>
                    <Label className="text-sm">绝密KD *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="2.5"
                      value={formData.kd}
                      onChange={(e) => {
                        const value = e.target.value;
                        // 允许输入小数，包括0.几
                        setFormData({...formData, kd: value});
                      }}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* 游戏道具（选填） */}
                <div>
                  <Label className="text-sm">游戏道具（选填）</Label>
                  <div className="mt-1.5 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                      填写游戏内的特殊道具
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">AWM子弹</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.awm_bullets}
                          onChange={(e) => setFormData({...formData, awm_bullets: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">6头数量</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.level6_helmet}
                          onChange={(e) => setFormData({...formData, level6_helmet: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">6甲数量</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.level6_armor}
                          onChange={(e) => setFormData({...formData, level6_armor: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 皮肤信息 */}
                <div>
                  <Label className="text-sm">皮肤信息（可多选）</Label>
                  {skinConfig.enabled && skinConfig.skins.length > 0 ? (
                    <div className="mt-1.5 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        请选择账号包含的皮肤
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {skinConfig.skins.map((skin) => (
                          <button
                            key={skin}
                            onClick={() => toggleSkin(skin)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                              formData.selected_skins.includes(skin)
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-md'
                                : 'bg-white border hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
                            }`}
                          >
                            {skin}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        皮肤功能未启用，请联系管理员配置
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 备注信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">备注信息 <span className="text-sm font-normal text-muted-foreground ml-2">填写特殊要求或说明</span></CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="请填写特殊要求，如：禁止开挂、禁止修改密码等"
                  value={formData.remark}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* 协议确认 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agreement"
                    checked={formData.agreement}
                    onCheckedChange={(checked) => setFormData({...formData, agreement: checked as boolean})}
                  />
                  <label
                    htmlFor="agreement"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    我已阅读并同意{' '}
                    <button
                      type="button"
                      className="text-purple-600 hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        setAgreementDialogOpen(true);
                      }}
                    >
                      《{agreements['virtual_assets']?.title || '虚拟资产出租出售协议'}》
                    </button>
                    {' '}
                    <button
                      type="button"
                      className="text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        setAgreementDialogOpen(true);
                      }}
                    >
                      [查看协议全文]
                    </button>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Link href="/seller/accounts" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  取消
                </Button>
              </Link>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                size="lg"
                disabled={!formData.agreement || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditMode ? '保存中...' : '提交中...'}
                  </>
                ) : (
                  isEditMode ? '保存修改' : '确认上架'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {agreements['virtual_assets']?.title || '虚拟资产出租出售协议'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
              {agreements['virtual_assets']?.content || '暂无协议内容'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewAccountPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600">加载中...</p>
        </CardContent>
      </Card>
    </div>}>
      <NewAccountPage />
    </Suspense>
  );
}

export default NewAccountPageWrapper;
