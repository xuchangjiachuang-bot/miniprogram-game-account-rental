/**
 * 短信配置管理器
 * 使用数据库持久化短信配置
 */

import { getDb } from "coze-coding-dev-sdk";
import { eq, sql, like, and, desc } from "drizzle-orm";
import { smsConfigs, smsRecords } from "./shared/schema";

export interface SmsConfig {
  id: string;
  provider: 'aliyun' | 'tencent' | 'yunpian';
  name: string;
  apiKey: string;
  apiSecret: string;
  signName: string;
  endpoint: string;
  enabled: boolean;
  defaultTemplate: string;
  maxDailyCount: number;
  currentCount: number;
}

export class SmsConfigManager {
  /**
   * 获取单个短信配置
   */
  async getSmsConfig(provider: string): Promise<SmsConfig | undefined> {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(smsConfigs)
      .where(eq(smsConfigs.provider, provider))
      .limit(1);

    if (!config) return undefined;

    return {
      id: config.id,
      provider: config.provider as any,
      name: config.name,
      apiKey: config.apiKey || '',
      apiSecret: config.apiSecret || '',
      signName: config.signName || '',
      endpoint: config.endpoint || '',
      enabled: config.enabled || false,
      defaultTemplate: config.defaultTemplate || '',
      maxDailyCount: config.maxDailyCount || 10000,
      currentCount: config.currentCount || 0
    };
  }

  /**
   * 获取所有短信配置
   */
  async getAllSmsConfigs(): Promise<Record<string, SmsConfig>> {
    const db = await getDb();
    const configs = await db.select().from(smsConfigs);

    const result: Record<string, SmsConfig> = {};
    for (const config of configs) {
      result[config.provider] = {
        id: config.id,
        provider: config.provider as any,
        name: config.name,
        apiKey: config.apiKey || '',
        apiSecret: config.apiSecret || '',
        signName: config.signName || '',
        endpoint: config.endpoint || '',
        enabled: config.enabled || false,
        defaultTemplate: config.defaultTemplate || '',
        maxDailyCount: config.maxDailyCount || 10000,
        currentCount: config.currentCount || 0
      };
    }

    return result;
  }

  /**
   * 更新短信配置
   */
  async updateSmsConfig(provider: string, config: Partial<SmsConfig>): Promise<boolean> {
    const db = await getDb();

    try {
      await db
        .update(smsConfigs)
        .set({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          signName: config.signName,
          endpoint: config.endpoint,
          enabled: config.enabled,
          defaultTemplate: config.defaultTemplate,
          maxDailyCount: config.maxDailyCount,
          updatedAt: new Date().toISOString()
        })
        .where(eq(smsConfigs.provider, provider));

      return true;
    } catch (error) {
      console.error('更新短信配置失败:', error);
      return false;
    }
  }

  /**
   * 增加短信发送计数
   */
  async incrementSmsCount(id: string): Promise<boolean> {
    const db = await getDb();

    try {
      await db
        .update(smsConfigs)
        .set({
          currentCount: sql`${smsConfigs.currentCount} + 1`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(smsConfigs.id, id));

      return true;
    } catch (error) {
      console.error('增加短信计数失败:', error);
      return false;
    }
  }

  /**
   * 重置每日短信计数
   */
  async resetDailyCount(provider: string): Promise<boolean> {
    const db = await getDb();

    try {
      await db
        .update(smsConfigs)
        .set({
          currentCount: 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(smsConfigs.provider, provider));

      return true;
    } catch (error) {
      console.error('重置短信计数失败:', error);
      return false;
    }
  }

  /**
   * 添加短信发送记录
   */
  async addSmsRecord(record: Omit<any, 'id' | 'createdAt'>): Promise<any> {
    const db = await getDb();

    try {
      const [newRecord] = await db
        .insert(smsRecords)
        .values({
          provider: record.provider,
          phone: record.phone,
          code: record.code,
          templateCode: record.templateCode,
          status: record.status,
          message: record.message,
          requestId: record.requestId,
          bizId: record.bizId
        })
        .returning();

      return newRecord;
    } catch (error) {
      console.error('添加短信记录失败:', error);
      return null;
    }
  }

  /**
   * 获取短信发送记录
   */
  async getSmsRecords(filters?: {
    phone?: string;
    provider?: string;
    status?: 'success' | 'failed';
    limit?: number;
  }): Promise<any[]> {
    const db = await getDb();

    const conditions = [];

    if (filters?.phone) {
      conditions.push(like(smsRecords.phone, filters.phone));
    }

    if (filters?.provider) {
      conditions.push(eq(smsRecords.provider, filters.provider));
    }

    if (filters?.status) {
      conditions.push(eq(smsRecords.status, filters.status));
    }

    // 构建查询
    let query = db.select().from(smsRecords);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // 执行查询
    return (query.orderBy(desc(smsRecords.createdAt)) as any).limit(filters?.limit || 100);
  }

  /**
   * 初始化默认短信配置
   */
  async initDefaultConfigs(): Promise<void> {
    const db = await getDb();

    const defaultConfigs = [
      {
        id: 'SMS_ALIYUN',
        provider: 'aliyun',
        name: '阿里云短信',
        apiKey: '',
        apiSecret: '',
        signName: '三角洲行动',
        endpoint: 'dysmsapi.aliyuncs.com',
        enabled: false,
        defaultTemplate: 'SMS_001',
        maxDailyCount: 10000,
        currentCount: 0
      },
      {
        id: 'SMS_TENCENT',
        provider: 'tencent',
        name: '腾讯云短信',
        apiKey: '',
        apiSecret: '',
        signName: '三角洲行动',
        endpoint: 'sms.tencentcloudapi.com',
        enabled: false,
        defaultTemplate: '100001',
        maxDailyCount: 5000,
        currentCount: 0
      },
      {
        id: 'SMS_YUNPIAN',
        provider: 'yunpian',
        name: '云片短信',
        apiKey: '',
        apiSecret: '',
        signName: '【三角洲行动】',
        endpoint: 'https://sms.yunpian.com/v2/sms/single_send.json',
        enabled: false,
        defaultTemplate: '',
        maxDailyCount: 1000,
        currentCount: 0
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await this.getSmsConfig(config.provider);
      if (!existing) {
        try {
          await db.insert(smsConfigs).values(config);
          console.log(`✓ 已创建短信配置: ${config.name}`);
        } catch (error) {
          console.error(`创建短信配置失败 ${config.name}:`, error);
        }
      }
    }
  }
}

export const smsConfigManager = new SmsConfigManager();
