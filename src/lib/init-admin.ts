import { db, admins } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * 初始化管理员表和默认管理员账号
 */
export async function initAdminTable() {
  try {
    // 创建管理员表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        name VARCHAR(50),
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[initAdminTable] 管理员表创建成功');

    // 检查是否已存在默认管理员账号
    const existingAdmins = await db
      .select()
      .from(admins)
      .where(eq(admins.username, 'admin'))
      .limit(1);

    if (existingAdmins.length === 0) {
      const initialPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!initialPassword || initialPassword.length < 16) {
        throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD to at least 16 characters to create the first admin.');
      }
      // 生成密码hash
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      // 插入默认管理员账号（不指定ID，让数据库自动生成UUID）
      await db.insert(admins).values({
        username: 'admin',
        password: passwordHash,
        email: 'admin@example.com',
        name: '超级管理员',
        role: 'superadmin',
        status: 'active'
      });

      console.log('[initAdminTable] 默认管理员账号创建成功');
    } else {
      console.log('[initAdminTable] 默认管理员账号已存在');
    }

    return { success: true, message: '管理员表初始化成功' };
  } catch (error: any) {
    console.error('[initAdminTable] 初始化失败:', error);
    return { success: false, error: error.message };
  }
}
