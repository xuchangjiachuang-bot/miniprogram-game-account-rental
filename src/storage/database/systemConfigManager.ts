import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { systemConfig } from "./shared/schema";
import { defaultHomepageConfig } from "@/lib/config-types";

type SystemConfig = typeof systemConfig.$inferSelect;

/**
 * 系统配置管理器
 * 用于管理系统级别的配置，包括首页配置等
 */
export class SystemConfigManager {
  /**
   * 获取配置值
   */
  async getConfigValue<T = any>(configKey: string): Promise<T | null> {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    return (config?.configValue as T) || null;
  }

  /**
   * 设置配置值
   */
  async setConfigValue<T = any>(
    configKey: string,
    configValue: T,
    description?: string
  ): Promise<SystemConfig> {
    const db = await getDb();

    // 检查配置是否已存在
    const [existingConfig] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    const now = new Date().toISOString();

    if (existingConfig) {
      // 更新现有配置
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
    } else {
      // 创建新配置
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
  }

  /**
   * 获取首页配置
   */
  async getHomepageConfig(): Promise<any> {
    try {
      const config = await this.getConfigValue('homepage_config');
      return config || defaultHomepageConfig;
    } catch (error) {
      console.error('获取首页配置失败:', error);
      return defaultHomepageConfig;
    }
  }

  /**
   * 保存首页配置
   */
  async saveHomepageConfig(config: any): Promise<any> {
    return await this.setConfigValue(
      'homepage_config',
      config,
      '首页轮播图、LOGO和皮肤选项配置'
    );
  }

  /**
   * 获取平台配置
   */
  async getPlatformConfig(configKey: string): Promise<any | null> {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, configKey))
      .limit(1);

    return config?.configValue || null;
  }

  /**
   * 设置平台配置
   */
  async setPlatformConfig(
    configKey: string,
    configValue: string,
    description?: string
  ): Promise<SystemConfig> {
    return await this.setConfigValue(configKey, configValue, description);
  }

  /**
   * 删除配置
   */
  async deleteConfig(configKey: string): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(systemConfig)
      .where(eq(systemConfig.configKey, configKey));

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    const db = await getDb();
    return db.select().from(systemConfig);
  }
}

export const systemConfigManager = new SystemConfigManager();
