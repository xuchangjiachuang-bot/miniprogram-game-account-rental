import { sqlClient } from '@/lib/db';

type SystemConfig = {
  id: string;
  configKey: string;
  configValue: unknown;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export class SystemConfigManager {
  async getConfigValue<T = any>(configKey: string): Promise<T | null> {
    const [config] = await sqlClient<Array<{ configValue: T | null }>>`
      select config_value as "configValue"
      from system_config
      where config_key = ${configKey}
      limit 1
    `;

    return config?.configValue ?? null;
  }

  async setConfigValue<T = any>(
    configKey: string,
    configValue: T,
    description?: string,
  ): Promise<SystemConfig> {
    const [existingConfig] = await sqlClient<Array<SystemConfig>>`
      select
        id,
        config_key as "configKey",
        config_value as "configValue",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from system_config
      where config_key = ${configKey}
      limit 1
    `;

    const now = new Date().toISOString();

    if (existingConfig) {
      const [updatedConfig] = await sqlClient<Array<SystemConfig>>`
        update system_config
        set
          config_value = ${configValue as any}::jsonb,
          description = ${description || existingConfig.description},
          updated_at = ${now}
        where config_key = ${configKey}
        returning
          id,
          config_key as "configKey",
          config_value as "configValue",
          description,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      return updatedConfig;
    }

    const [newConfig] = await sqlClient<Array<SystemConfig>>`
      insert into system_config (
        config_key,
        config_value,
        description,
        created_at,
        updated_at
      ) values (
        ${configKey},
        ${configValue as any}::jsonb,
        ${description || configKey},
        ${now},
        ${now}
      )
      returning
        id,
        config_key as "configKey",
        config_value as "configValue",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return newConfig;
  }

  async getHomepageConfig(): Promise<any> {
    return this.getConfigValue('homepage_config');
  }

  async saveHomepageConfig(config: any): Promise<any> {
    return this.setConfigValue(
      'homepage_config',
      config,
      '首页轮播图、LOGO和皮肤选项配置',
    );
  }

  async getPlatformConfig(configKey: string): Promise<any | null> {
    const [config] = await sqlClient<Array<{ configValue: unknown | null }>>`
      select config_value as "configValue"
      from system_config
      where config_key = ${configKey}
      limit 1
    `;

    return config?.configValue ?? null;
  }

  async setPlatformConfig(
    configKey: string,
    configValue: string,
    description?: string,
  ): Promise<SystemConfig> {
    return this.setConfigValue(configKey, configValue, description);
  }

  async deleteConfig(configKey: string): Promise<boolean> {
    const deletedRows = await sqlClient<Array<{ id: string }>>`
      delete from system_config
      where config_key = ${configKey}
      returning id
    `;

    return deletedRows.length > 0;
  }

  async getAllConfigs(): Promise<SystemConfig[]> {
    return sqlClient<Array<SystemConfig>>`
      select
        id,
        config_key as "configKey",
        config_value as "configValue",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from system_config
      order by created_at asc
    `;
  }
}

export const systemConfigManager = new SystemConfigManager();
