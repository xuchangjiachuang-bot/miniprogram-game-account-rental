import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 将默认管理员账号升级为超级管理员
 */
export async function upgradeDefaultAdmin() {
  try {
    // 查找admin账号
    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.username, 'admin'))
      .limit(1);

    if (adminList.length === 0) {
      console.log('[upgradeDefaultAdmin] 未找到admin账号');
      return { success: false, error: '未找到admin账号' };
    }

    const admin = adminList[0];

    // 更新为超级管理员
    await db
      .update(admins)
      .set({
        role: 'superadmin',
        name: '超级管理员',
        updatedAt: new Date().toISOString()
      })
      .where(eq(admins.id, admin.id));

    console.log('[upgradeDefaultAdmin] 管理员账号已升级为超级管理员');
    return { success: true, message: '管理员账号已升级为超级管理员' };
  } catch (error: any) {
    console.error('[upgradeDefaultAdmin] 升级失败:', error);
    return { success: false, error: error.message };
  }
}
