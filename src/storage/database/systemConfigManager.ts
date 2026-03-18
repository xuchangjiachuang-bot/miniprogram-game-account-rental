import { eq } from 'drizzle-orm';
import { getDb } from 'coze-coding-dev-sdk';
import { systemConfig } from './shared/schema';

type SystemConfig = typeof systemConfig.$inferSelect;

export class SystemConfigManager {
  async getConfigValue<T = any>(configKey: string): Promise<T | null> {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    return (config?.configValue as T) || null;
  }

  async setConfigValue<T = any>(
    configKey: string,
    configValue: T,
    description?: string,
  ): Promise<SystemConfig> {
    const db = await getDb();
    const [existingConfig] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    const now = new Date().toISOString();

    if (existingConfig) {
      const [updatedConfig] = await db
        .update(systemConfig)
        .set({
          configValue: configValue as any,
          description: description || existingConfig.description,
          updatedAt: now,
        })
        .where(eq(systemConfig.configKey, configKey))
        .returning();

      return updatedConfig;
    }

    const [newConfig] = await db
      .insert(systemConfig)
      .values({
        configKey,
        configValue: configValue as any,
        description: description || configKey,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return newConfig;
  }

  async getHomepageConfig(): Promise<any> {
    try {
      return await this.getConfigValue('homepage_config');
    } catch (error) {
      console.error('获取首页配置失败:', error);
      return null;
    }
  }

  async saveHomepageConfig(config: any): Promise<any> {
    return await this.setConfigValue(
      'homepage_config',
      config,
      '首页轮播图、LOGO和皮肤选项配置',
    );
  }

  async getPlatformConfig(configKey: string): Promise<any | null> {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    return config?.configValue || null;
  }

  async setPlatformConfig(
    configKey: string,
    configValue: string,
    description?: string,
  ): Promise<SystemConfig> {
    return await this.setConfigValue(configKey, configValue, description);
  }

  async deleteConfig(configKey: string): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(systemConfig)
      .where(eq(systemConfig.configKey, configKey));

    return (result.rowCount ?? 0) > 0;
  }

  async getAllConfigs(): Promise<SystemConfig[]> {
    const db = await getDb();
    return db.select().from(systemConfig);
  }
}

export const systemConfigManager = new SystemConfigManager();
