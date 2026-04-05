// utils/mock-data.js

module.exports = {
  homepageConfig: {
    carousels: [],
    skinOptions: [
      { id: 'skin_1', name: '龙牙', category: '刀皮' },
      { id: 'skin_2', name: '信条', category: '刀皮' },
      { id: 'skin_3', name: '影锋', category: '刀皮' },
      { id: 'skin_4', name: '维什戴尔-麦晓雯', category: '干员皮肤' },
      { id: 'skin_5', name: '电锯惊魂-红狼', category: '干员皮肤' }
    ],
    fallbackTitle: {
      badgeText: '专业哈夫币账号出租平台',
      mainTitle: '三角洲行动账号出租',
      subTitle: '担保交易、押金保障、在线沟通，让账号租赁更省心。',
      buttonText: '发布账号'
    }
  },
  accounts: [
    {
      id: 'mock_account_1',
      sellerId: 'mock_seller_1',
      accountId: 'wegame_河南省_许昌市_mock_1',
      title: '哈夫币15M | 顶级安全箱(3x3) | 7体力 | 6负重 | 铂金',
      description: '支持微信扫码，账号稳定，适合日常租用。',
      screenshots: ['/images/default-account.png'],
      coinsM: '15.00',
      safeboxCount: 9,
      energyValue: 6,
      staminaValue: 7,
      customAttributes: {
        kd: '0.5',
        city: '许昌市',
        rank: 'platinum',
        province: '河南省',
        loginMethod: 'wechat',
        accountLevel: '60',
        awmBullets: '60',
        level6Armor: '8',
        level6Helmet: '5'
      },
      tags: ['龙牙', '维什戴尔-麦晓雯', '电锯惊魂-红狼'],
      accountValue: '39.47',
      recommendedRental: '39.47',
      rentalRatio: '38.00',
      deposit: '100.00',
      totalPrice: '139.47',
      rentalHours: '48.00',
      rentalDescription: '2天（48小时）',
      viewCount: 12,
      tradeCount: 3,
      status: 'available',
      createdAt: '2026-04-01 12:00:00',
      listedAt: '2026-04-01 12:00:00',
      auditStatus: 'approved'
    },
    {
      id: 'mock_account_2',
      sellerId: 'mock_seller_2',
      accountId: 'wegame_天津市_天津市_mock_2',
      title: '哈夫币50M | 顶级安全箱(3x3) | 7体力 | 7负重 | 钻石',
      description: '支持 QQ 扫码，上号快速，皮肤质量高。',
      screenshots: ['/images/default-account.png'],
      coinsM: '50.00',
      safeboxCount: 9,
      energyValue: 7,
      staminaValue: 7,
      customAttributes: {
        kd: '1',
        city: '天津市',
        rank: 'diamond',
        province: '天津市',
        loginMethod: 'qq_scan',
        accountLevel: '60',
        awmBullets: '60',
        level6Armor: '6',
        level6Helmet: '6'
      },
      tags: ['信条', '凌宵戍卫-威龙'],
      accountValue: '142.86',
      recommendedRental: '142.86',
      rentalRatio: '35.00',
      deposit: '200.00',
      totalPrice: '342.86',
      rentalHours: '120.00',
      rentalDescription: '5天（120小时）',
      viewCount: 20,
      tradeCount: 5,
      status: 'available',
      createdAt: '2026-04-02 09:00:00',
      listedAt: '2026-04-02 09:00:00',
      auditStatus: 'approved'
    },
    {
      id: 'mock_account_3',
      sellerId: 'mock_seller_3',
      accountId: 'wegame_北京市_北京市_mock_3',
      title: '哈夫币80M | 2x3安全箱 | 6体力 | 6负重 | 黑鹰',
      description: '支持 QQ 账号密码，适合长租。',
      screenshots: ['/images/default-account.png'],
      coinsM: '80.00',
      safeboxCount: 6,
      energyValue: 6,
      staminaValue: 6,
      customAttributes: {
        kd: '1.2',
        city: '北京市',
        rank: 'blackeagle',
        province: '北京市',
        loginMethod: 'qq',
        accountLevel: '55',
        awmBullets: '45',
        level6Armor: '4',
        level6Helmet: '4'
      },
      tags: ['影锋', '已解锁赛伊德'],
      accountValue: '88.00',
      recommendedRental: '88.00',
      rentalRatio: '30.00',
      deposit: '150.00',
      totalPrice: '238.00',
      rentalHours: '72.00',
      rentalDescription: '3天（72小时）',
      viewCount: 8,
      tradeCount: 1,
      status: 'available',
      createdAt: '2026-04-03 16:00:00',
      listedAt: '2026-04-03 16:00:00',
      auditStatus: 'approved'
    }
  ],
  orders: [
    {
      id: 'mock_order_1',
      orderNumber: 'ORD202604050001',
      status: 'renting',
      account: {
        id: 'mock_account_1',
        title: '哈夫币15M | 顶级安全箱(3x3)',
        avatar: '/images/default-account.png',
        tags: ['龙牙', '维什戴尔-麦晓雯']
      },
      rentalPrice: 39.47,
      deposit: 100.0,
      totalPrice: 139.47,
      startTime: '2026-04-05 10:00',
      endTime: '2026-04-07 10:00',
      createdAt: '2026-04-05 10:00'
    }
  ],
  chatList: [
    {
      id: 'mock_chat_1',
      targetUser: {
        id: 'service_1',
        nickname: '在线客服',
        avatar: '/images/default-avatar.png'
      },
      lastMessage: '您好，有什么可以帮您？',
      lastTime: '10:30',
      unreadCount: 1
    }
  ],
  userInfo: {
    id: 'mock_user_1',
    nickname: '测试用户',
    avatar: '/images/default-avatar.png',
    phone: '13800008888',
    balance: 1000,
    isVerified: true,
    createdAt: '2026-04-01'
  },
  userStats: {
    orderCount: 12,
    collectCount: 5,
    balance: 520,
    creditScore: 750
  },
  wallet: {
    balance: 520,
    totalRecharge: 1000,
    totalWithdraw: 480,
    availableBalance: 520
  },
  transactions: [
    {
      id: 'TXN_001',
      type: 'order_payment',
      amount: -39.47,
      title: '账号租赁支付',
      createTime: new Date().getTime() - 7200000
    },
    {
      id: 'TXN_002',
      type: 'recharge',
      amount: 100,
      title: '微信充值',
      createTime: new Date().getTime() - 86400000
    }
  ]
};