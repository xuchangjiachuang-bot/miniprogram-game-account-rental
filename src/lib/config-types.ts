// 轮播图配置接口
export interface CarouselItem {
  id: string;
  title: string;
  description: string;
  imageKey?: string;
  imageUrl?: string;
  linkUrl?: string;
  order: number;
  enabled: boolean;
}

// LOGO配置接口
export interface LogoConfig {
  id: string;
  name: string;
  imageKey?: string;
  type: 'image' | 'text'; // LOGO类型：图片或文字
  imageUrl?: string; // 图片URL（type为image时使用）
  text?: string; // 文字内容（type为text时使用）
  textStyle?: {
    fontSize?: string; // 字体大小，如 '2xl'
    fontWeight?: string; // 字体粗细，如 'bold'
  }; // 文字样式配置（不再支持颜色设置）
  linkUrl?: string;
  enabled: boolean;
}

// 皮肤选项接口
export interface SkinOption {
  id: string;
  name: string;
  code?: string; // 自动生成的皮肤代码，用于显示和唯一标识
  iconUrl?: string;
  category?: string;
  enabled: boolean;
  createdAt: string;
}

// 网站备案信息接口
export interface FooterInfo {
  copyright: string; // 版权信息
  icpNumber: string; // ICP备案号
  publicSecurityNumber: string; // 公网安备号
  otherInfo?: string; // 其他信息
}

// 首页配置接口
export interface HomepageConfig {
  carousels: CarouselItem[];
  logos: LogoConfig[];
  skinOptions: SkinOption[];
  footerInfo: FooterInfo;
}

// 默认配置
export const defaultHomepageConfig: HomepageConfig = {
  carousels: [
    {
      id: '1',
      title: '三角洲行动哈夫币租赁',
      description: '安全可靠，快速交易，享受游戏乐趣',
      imageUrl: '/images/carousel-1.jpg',
      linkUrl: '/',
      order: 0,
      enabled: true
    },
    {
      id: '2',
      title: '海量账号任你选',
      description: '从白银到钻石，满足各种需求',
      imageUrl: '/images/carousel-2.jpg',
      linkUrl: '/',
      order: 1,
      enabled: true
    }
  ],
  logos: [
    {
      id: '1',
      name: '主LOGO',
      type: 'text',
      text: 'YuGiOh',
      textStyle: {
        fontSize: 'xl',
        fontWeight: 'bold'
      },
      linkUrl: '/',
      enabled: true
    }
  ],
  skinOptions: [
    // 枪皮
    {
      id: '1',
      name: 'M4A1-雷神',
      code: 'M4A1_LS',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'AK47-火麒麟',
      code: 'AK47_HQL',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'AWM-天龙',
      code: 'AWM_TL',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '4',
      name: '巴雷特-毁灭',
      code: 'BARRETT_HM',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '5',
      name: 'M4A1-黑龙',
      code: 'M4A1_HL',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '6',
      name: 'AK47-黑骑士',
      code: 'AK47_HQS',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '7',
      name: 'AK47-火麒麟-幻',
      code: 'AK47_HQL_H',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '8',
      name: 'M4A1-雷神-幻',
      code: 'M4A1_LS_H',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '9',
      name: '汤姆逊-烈龙',
      code: 'TOMSON_LL',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '10',
      name: '沙漠之鹰-修罗',
      code: 'DEAGLE_XL',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '11',
      name: 'AWM-天龙-幻',
      code: 'AWM_TL_H',
      category: '枪皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    // 刀皮
    {
      id: '12',
      name: '怜悯-影锋',
      code: 'LM_YF',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '13',
      name: '战意-龙魂',
      code: 'ZY_LH',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '14',
      name: '寂灭-冥王',
      code: 'JM_MW',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '15',
      name: '虚空-夜煞',
      code: 'XK_NS',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '16',
      name: '血影-修罗',
      code: 'XY_XL',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '17',
      name: '寒冰-霜刃',
      code: 'HB_SJ',
      category: '刀皮',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    // 干员皮肤
    {
      id: '18',
      name: '水墨云图',
      code: 'SMYT',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '19',
      name: '露娜-金牌射手',
      code: 'LN_JPSS',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '20',
      name: '红狼-电锯惊魂',
      code: 'HL_DJ',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '21',
      name: '红狼-嗜金玫瑰',
      code: 'HL_SJMG',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '22',
      name: '威龙-壮志凌云',
      code: 'WL_ZZLY',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '23',
      name: '蜂医-送葬人',
      code: 'FY_SRR',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '24',
      name: '无名-夜鹰',
      code: 'WM_YE',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '25',
      name: '女娲-创世',
      code: 'NW_CS',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '26',
      name: '雷诺-雷霆万钧',
      code: 'LN_LTWJ',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '27',
      name: '红狼-狂战士',
      code: 'HL_KZS',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '28',
      name: '玛拉-暗夜女王',
      code: 'ML_AYNW',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '29',
      name: '牧羊人-守护者',
      code: 'MYR_SHZ',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '30',
      name: '蜂医-生命之源',
      code: 'FY_SMZY',
      category: '干员皮肤',
      enabled: true,
      createdAt: new Date().toISOString()
    }
  ],
  footerInfo: {
    copyright: '© 2026 YuGiOh. 保留所有权利.',
    icpNumber: '',
    publicSecurityNumber: '',
    otherInfo: ''
  }
};
