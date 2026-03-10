// utils/mock-data.js

/**
 * Mock数据 - 用于测试和演示
 */

module.exports = {
  // 轮播图
  carousels: [
    {
      id: 1,
      imageUrl: 'https://via.placeholder.com/750x300/6366f1/ffffff?text=哈夫币租赁平台',
      link: '',
      title: '安全快捷的哈夫币租赁服务'
    },
    {
      id: 2,
      imageUrl: 'https://via.placeholder.com/750x300/8b5cf6/ffffff?text=担保交易',
      link: '',
      title: '担保交易，资金安全'
    },
    {
      id: 3,
      imageUrl: 'https://via.placeholder.com/750x300/10b981/ffffff?text=押金保障',
      link: '',
      title: '押金保障，放心租赁'
    }
  ],

  // 皮肤选项
  skinOptions: [
    { id: 1, name: '彩虹', category: '降落伞' },
    { id: 2, name: '金龙', category: '降落伞' },
    { id: 3, name: '黑鹰', category: '服装' },
    { id: 4, name: '黄金', category: '服装' },
    { id: 5, name: '钻石', category: '服装' },
    { id: 6, name: '彩虹套装', category: '套装' },
    { id: 7, name: '黑龙', category: '载具' },
    { id: 8, name: '黄金枪', category: '武器' }
  ],

  // 账号列表
  accounts: [
    {
      id: 1,
      account_name: 'wx123456',
      platform: 'Wegame · 微信扫码',
      loginMethod: 'wechat',
      rank: '黄金',
      coins: 50000,
      coins_display: '50,000',
      ratio: 0.5,
      ratio_display: '50%',
      rent_price: 15,
      rent_unit: 'hour',
      total_price: 18,
      deposit: 300,
      status: 'available',
      statusText: '可租赁',
      account_level: 25,
      safebox: '2×3',
      province: '北京',
      city: '北京',
      images: ['https://via.placeholder.com/400x300/6366f1/ffffff?text=1'],
      description: '包含多个热门皮肤，武器齐全',
      tags: ['皮肤多', '枪械全', '信誉好'],
      owner: {
        id: 'OWNER_001',
        nickname: '测试商家',
        avatar: 'https://via.placeholder.com/100x100/6366f1/ffffff?text=商'
      },
      createdAt: '2026-02-26'
    },
    {
      id: 2,
      account_name: 'qq789012',
      platform: 'Wegame · QQ账号密码',
      loginMethod: 'qq',
      rank: '铂金',
      coins: 100000,
      coins_display: '100,000',
      ratio: 0.4,
      ratio_display: '40%',
      rent_price: 25,
      rent_unit: 'hour',
      total_price: 30,
      deposit: 500,
      status: 'available',
      statusText: '可租赁',
      account_level: 35,
      safebox: '3×3',
      province: '上海',
      city: '上海',
      images: ['https://via.placeholder.com/400x300/8b5cf6/ffffff?text=2'],
      description: '钻石级账号，稀有皮肤',
      tags: ['稀有皮肤', '高等级', '安全'],
      owner: {
        id: 'OWNER_002',
        nickname: '金牌卖家',
        avatar: 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=金'
      },
      createdAt: '2026-02-26'
    },
    {
      id: 3,
      account_name: 'steam345678',
      platform: 'Steam · 账号密码',
      loginMethod: 'steam',
      rank: '钻石',
      coins: 200000,
      coins_display: '200,000',
      ratio: 0.3,
      ratio_display: '30%',
      rent_price: 40,
      rent_unit: 'hour',
      total_price: 48,
      deposit: 800,
      status: 'available',
      statusText: '可租赁',
      account_level: 50,
      safebox: '3×3',
      province: '广州',
      city: '广州',
      images: ['https://via.placeholder.com/400x300/10b981/ffffff?text=3'],
      description: '顶级账号，黑鹰段位',
      tags: ['黑鹰', '顶级账号', '押金高'],
      owner: {
        id: 'OWNER_003',
        nickname: '顶级商家',
        avatar: 'https://via.placeholder.com/100x100/10b981/ffffff?text=顶'
      },
      createdAt: '2026-02-26'
    },
    {
      id: 4,
      account_name: 'wx901234',
      platform: 'Wegame · 微信扫码',
      loginMethod: 'wechat',
      rank: '青铜',
      coins: 20000,
      coins_display: '20,000',
      ratio: 0.8,
      ratio_display: '80%',
      rent_price: 8,
      rent_unit: 'hour',
      total_price: 10,
      deposit: 150,
      status: 'available',
      statusText: '可租赁',
      account_level: 10,
      safebox: '1×2',
      province: '深圳',
      city: '深圳',
      images: ['https://via.placeholder.com/400x300/f59e0b/ffffff?text=4'],
      description: '入门级账号，新手首选',
      tags: ['新手', '便宜', '安全'],
      owner: {
        id: 'OWNER_004',
        nickname: '新手商家',
        avatar: 'https://via.placeholder.com/100x100/f59e0b/ffffff?text=新'
      },
      createdAt: '2026-02-26'
    },
    {
      id: 5,
      account_name: 'qq567890',
      platform: 'Wegame · QQ账号密码',
      loginMethod: 'qq',
      rank: '黑鹰',
      coins: 500000,
      coins_display: '500,000',
      ratio: 0.25,
      ratio_display: '25%',
      rent_price: 60,
      rent_unit: 'hour',
      total_price: 72,
      deposit: 1200,
      status: 'renting',
      statusText: '租赁中',
      account_level: 80,
      safebox: '3×3',
      province: '杭州',
      city: '杭州',
      images: ['https://via.placeholder.com/400x300/ef4444/ffffff?text=5'],
      description: '黑鹰王者，全服排名',
      tags: ['黑鹰王者', '全服排名', '稀有'],
      owner: {
        id: 'OWNER_005',
        nickname: '王者商家',
        avatar: 'https://via.placeholder.com/100x100/ef4444/ffffff?text=王'
      },
      createdAt: '2026-02-26'
    }
  ],

  // 首页配置
  homepageConfig: {
    carousels: [
      {
        id: 1,
        imageUrl: 'https://via.placeholder.com/750x360/6366f1/ffffff?text=哈夫币租赁平台',
        linkUrl: '',
        title: '安全快捷的哈夫币租赁服务',
        description: '担保交易 · 押金保障 · 24小时客服'
      },
      {
        id: 2,
        imageUrl: 'https://via.placeholder.com/750x360/8b5cf6/ffffff?text=担保交易',
        linkUrl: '',
        title: '担保交易，资金安全',
        description: '第三方担保，保障双方权益'
      },
      {
        id: 3,
        imageUrl: 'https://via.placeholder.com/750x360/10b981/ffffff?text=押金保障',
        linkUrl: '',
        title: '押金保障，放心租赁',
        description: '全额押金，违约赔付'
      }
    ],
    skinOptions: [
      { id: 1, name: '彩虹', category: '降落伞' },
      { id: 2, name: '金龙', category: '降落伞' },
      { id: 3, name: '黑鹰', category: '服装' },
      { id: 4, name: '黄金', category: '服装' },
      { id: 5, name: '钻石', category: '服装' },
      { id: 6, name: '彩虹套装', category: '套装' },
      { id: 7, name: '黑龙', category: '载具' },
      { id: 8, name: '黄金枪', category: '武器' }
    ],
    fallbackTitle: {
      badgeText: '📈 专业哈夫币出租平台',
      mainTitle: '哈夫币出租',
      subTitle: '安全快捷的哈夫币租赁服务 | 担保交易 | 押金保障',
      buttonText: '发布账号'
    }
  },

  // 订单列表
  orders: [
    {
      id: 1,
      orderNumber: 'ORD202602260001',
      status: 'renting',
      account: {
        id: 1,
        name: 'wx123456',
        image: 'https://via.placeholder.com/100x100/6366f1/ffffff?text=1',
        coins: 50000,
        ratio: '1:200'
      },
      rentalPrice: 15,
      deposit: 300,
      startTime: '2026-02-26 10:00',
      endTime: '2026-02-26 12:00',
      createdAt: '2026-02-26 10:00'
    },
    {
      id: 2,
      orderNumber: 'ORD202602260002',
      status: 'completed',
      account: {
        id: 2,
        name: 'qq789012',
        image: 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=2',
        coins: 100000,
        ratio: '1:250'
      },
      rentalPrice: 25,
      deposit: 500,
      startTime: '2026-02-25 14:00',
      endTime: '2026-02-25 16:00',
      createdAt: '2026-02-25 14:00'
    }
  ],

  // 消息列表
  chatList: [
    {
      id: 1,
      targetUser: {
        id: 2,
        nickname: '客服小美',
        avatar: 'https://via.placeholder.com/80x80/8b5cf6/ffffff?text=客服'
      },
      lastMessage: '您好，有什么可以帮助您的吗？',
      lastTime: '10:30',
      unreadCount: 2
    },
    {
      id: 2,
      targetUser: {
        id: 3,
        nickname: '账号出租人',
        avatar: 'https://via.placeholder.com/80x80/10b981/ffffff?text=出租'
      },
      lastMessage: '账号已发送，请查收',
      lastTime: '昨天',
      unreadCount: 0
    }
  ],

  // 用户信息
  userInfo: {
    id: 1,
    nickname: '测试用户',
    avatar: 'https://via.placeholder.com/100x100/6366f1/ffffff?text=用户',
    phone: '138****8888',
    balance: 1000,
    isVerified: true,
    createdAt: '2026-02-01'
  },

  // 用户统计
  userStats: {
    orderCount: 12,
    collectCount: 5,
    balance: 520.00,
    creditScore: 750
  },

  // 钱包信息
  wallet: {
    balance: 520.00,
    totalRecharge: 1000.00,
    totalWithdraw: 480.00,
    availableBalance: 520.00
  },

  // 交易记录
  transactions: [
    {
      id: 'TXN_001',
      type: 'order_payment',
      amount: -10.00,
      title: '账号租赁',
      createTime: new Date().getTime() - 7200000
    },
    {
      id: 'TXN_002',
      type: 'recharge',
      amount: 100.00,
      title: '微信充值',
      createTime: new Date().getTime() - 86400000
    },
    {
      id: 'TXN_003',
      type: 'withdraw',
      amount: -50.00,
      title: '提现到微信',
      createTime: new Date().getTime() - 172800000
    },
    {
      id: 'TXN_004',
      type: 'order_refund',
      amount: 30.00,
      title: '订单退款',
      createTime: new Date().getTime() - 259200000
    }
  ]
};
