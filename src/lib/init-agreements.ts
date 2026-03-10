import { db, agreements } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 初始化协议表和默认协议
 */
export async function initAgreementsTable() {
  try {
    // 创建协议表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[initAgreementsTable] 协议表创建成功');

    // 检查是否已存在默认协议
    const existingAgreements = await db
      .select()
      .from(agreements)
      .where(eq(agreements.key, 'virtual_assets'))
      .limit(1);

    if (existingAgreements.length === 0) {
      // 插入默认协议
      await db.insert(agreements).values({
        key: 'virtual_assets',
        title: '虚拟资产出租出售协议',
        content: `虚拟资产出租出售协议

甲方（卖家）：\n乙方（买家）：\n\n一、服务内容\n1. 甲方同意将游戏账号出租给乙方使用；\n2. 租赁期间乙方获得账号使用权；\n3. 租赁结束后乙方需按时归还账号。\n\n二、租金和押金\n1. 乙方需支付账号租金和押金；\n2. 租金根据账号价值计算；\n3. 押金作为行为保证金，正常使用后退还。\n\n三、双方责任\n1. 甲方保证账号安全，不得在租赁期间修改密码；\n2. 乙方不得利用账号进行违规操作；\n3. 乙方不得泄露账号信息给第三方。\n\n四、违约责任\n1. 乙方违规使用账号，押金不予退还；\n2. 甲方违规操作，需赔偿乙方损失。\n\n五、争议解决\n1. 本协议发生争议，双方协商解决；\n2. 协商不成，提交平台仲裁。`,
        enabled: true
      });

      console.log('[initAgreementsTable] 默认协议创建成功');
    } else {
      console.log('[initAgreementsTable] 默认协议已存在');
    }

    return { success: true, message: '协议表初始化成功' };
  } catch (error: any) {
    console.error('[initAgreementsTable] 初始化失败:', error);
    return { success: false, error: error.message };
  }
}
