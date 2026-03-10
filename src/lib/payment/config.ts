/**
 * 支付配置数据库访问函数
 */

import { db, paymentConfigs, sqlClient } from '../db';
import { eq, and } from 'drizzle-orm';

export interface PaymentConfig {
  id: string;
  configType: string;
  configKey: string;
  configValue: string;
  isEncrypted: boolean;
  description?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

async function selectPaymentConfigs(whereClause = '', params: Array<string | boolean> = []): Promise<PaymentConfig[]> {
  const query = `
    select
      id,
      config_type as "configType",
      config_key as "configKey",
      config_value as "configValue",
      is_encrypted as "isEncrypted",
      description,
      enabled,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from payment_configs
    ${whereClause}
  `;

  return sqlClient.unsafe<PaymentConfig[]>(query, params as any[]);
}

/**
 * 获取支付配置
 */
export async function getPaymentConfig(configType: string, configKey: string): Promise<PaymentConfig | null> {
  const result = await selectPaymentConfigs(
    'where config_type = $1 and config_key = $2 and enabled = $3 limit 1',
    [configType, configKey, true]
  );

  return result[0] || null;
}

/**
 * 获取所有支付配置（按类型）
 */
export async function getPaymentConfigsByType(configType: string): Promise<PaymentConfig[]> {
  return selectPaymentConfigs('where config_type = $1 order by config_key asc', [configType]);
}

/**
 * 设置支付配置
 */
export async function setPaymentConfig(
  configType: string,
  configKey: string,
  configValue: string,
  options?: {
    isEncrypted?: boolean;
    description?: string;
    enabled?: boolean;
  }
): Promise<PaymentConfig> {
  const existing = await getPaymentConfig(configType, configKey);

  const data = {
    configType,
    configKey,
    configValue,
    isEncrypted: options?.isEncrypted ?? true,
    description: options?.description,
    enabled: options?.enabled ?? true,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    // 更新现有配置
    const results = await db
      .update(paymentConfigs)
      .set(data)
      .where(eq(paymentConfigs.id, existing.id))
      .returning();

    return results[0];
  } else {
    // 创建新配置
    const results = await db
      .insert(paymentConfigs)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return results[0];
  }
}

/**
 * 删除支付配置
 */
export async function deletePaymentConfig(configType: string, configKey: string): Promise<boolean> {
  const result = await db
    .delete(paymentConfigs)
    .where(
      and(
        eq(paymentConfigs.configType, configType),
        eq(paymentConfigs.configKey, configKey)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * 切换支付配置启用状态
 */
export async function togglePaymentConfig(configType: string, configKey: string): Promise<PaymentConfig | null> {
  const existing = await getPaymentConfig(configType, configKey);

  if (!existing) {
    return null;
  }

  const results = await db
    .update(paymentConfigs)
    .set({
      enabled: !existing.enabled,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(paymentConfigs.id, existing.id))
    .returning();

  return results[0] || null;
}

/**
 * 批量设置支付配置
 */
export async function batchSetPaymentConfigs(
  configs: Array<{
    configType: string;
    configKey: string;
    configValue: string;
    description?: string;
  }>
): Promise<PaymentConfig[]> {
  const results: PaymentConfig[] = [];

  for (const config of configs) {
    const result = await setPaymentConfig(
      config.configType,
      config.configKey,
      config.configValue,
      {
        description: config.description,
        isEncrypted: true,
        enabled: true,
      }
    );
    results.push(result);
  }

  return results;
}

/**
 * 初始化默认支付配置
 */
export async function initDefaultPaymentConfigs() {
  const configs = [
    // 微信支付配置
    {
      configType: 'wechat',
      configKey: 'appid',
      configValue: process.env.WECHAT_APPID || '',
      description: '微信应用ID',
    },
    {
      configType: 'wechat',
      configKey: 'mch_id',
      configValue: process.env.WECHAT_MCH_ID || '',
      description: '微信商户号',
    },
    {
      configType: 'wechat',
      configKey: 'api_key',
      configValue: process.env.WECHAT_API_KEY || '',
      description: '微信支付API密钥',
    },
    {
      configType: 'wechat',
      configKey: 'notify_url',
      configValue: process.env.WECHAT_NOTIFY_URL || '',
      description: '支付回调地址',
    },
    {
      configType: 'wechat',
      configKey: 'mp_appid',
      configValue: process.env.WECHAT_MP_APPID || '',
      description: '公众号AppID',
    },
    {
      configType: 'wechat',
      configKey: 'mp_secret',
      configValue: process.env.WECHAT_MP_SECRET || '',
      description: '公众号AppSecret',
    },
    // 微信支付证书配置（用于退款等功能，需要用户自己配置）
    {
      configType: 'wechat',
      configKey: 'cert_path',
      configValue: '',
      description: '证书路径（绝对路径）',
    },
    {
      configType: 'wechat',
      configKey: 'key_path',
      configValue: '',
      description: '密钥路径（绝对路径）',
    },
    {
      configType: 'wechat',
      configKey: 'cert_p12_password',
      configValue: '',
      description: '证书密码',
    },
    {
      configType: 'wechat',
      configKey: 'cert_serial_no',
      configValue: '',
      description: '证书序列号',
    },
  ];

  // 只在配置值为空时创建默认配置
  for (const config of configs) {
    const existing = await getPaymentConfig(config.configType, config.configKey);
    if (!existing && config.configValue) {
      await setPaymentConfig(config.configType, config.configKey, config.configValue, {
        description: config.description,
        isEncrypted: true,
        enabled: true,
      });
    }
  }
}
