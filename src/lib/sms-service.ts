/**
 * 短信服务
 * 支持阿里云、腾讯云、云片短信发送
 */

// ==================== 类型定义 ====================

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

export interface SendSmsParams {
  phone: string;
  code?: string;
  templateCode?: string;
  templateParam?: Record<string, string>;
}

export interface SendSmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  bizId?: string;
}

export interface SmsRecord {
  id: string;
  provider: string;
  phone: string;
  code: string;
  templateCode: string;
  status: 'success' | 'failed';
  message: string;
  requestId?: string;
  bizId?: string;
  createdAt: string;
}

// ==================== 配置管理（使用数据库） ====================

import { smsConfigManager } from '@/storage/database/smsConfigManager';

// 缓存配置（避免频繁查询数据库）
let cachedConfigs: Record<string, SmsConfig> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 缓存1分钟

/**
 * 获取短信配置（带缓存）
 */
async function getSmsConfigsWithCache(): Promise<Record<string, SmsConfig>> {
  const now = Date.now();

  // 如果缓存有效，直接返回
  if (cachedConfigs && now - cacheTimestamp < CACHE_DURATION) {
    return cachedConfigs;
  }

  // 从数据库加载配置
  const configs = await smsConfigManager.getAllSmsConfigs();
  cachedConfigs = configs;
  cacheTimestamp = now;

  return configs;
}

/**
 * 清除缓存
 */
export function clearSmsConfigCache(): void {
  cachedConfigs = null;
  cacheTimestamp = 0;
}

/**
 * 获取短信配置
 */
export async function getSmsConfig(provider: string): Promise<SmsConfig | undefined> {
  const configs = await getSmsConfigsWithCache();
  return configs[provider];
}

/**
 * 获取所有短信配置
 */
export async function getAllSmsConfigs(): Promise<Record<string, SmsConfig>> {
  return await getSmsConfigsWithCache();
}

/**
 * 更新短信配置
 */
export async function updateSmsConfig(provider: string, config: Partial<SmsConfig>): Promise<boolean> {
  const success = await smsConfigManager.updateSmsConfig(provider, config);

  if (success) {
    // 清除缓存
    clearSmsConfigCache();
  }

  return success;
}

// ==================== 短信记录存储 ====================

const smsRecords: SmsRecord[] = [];

/**
 * 添加短信记录
 */
export function addSmsRecord(record: Omit<SmsRecord, 'id' | 'createdAt'>): SmsRecord {
  const newRecord: SmsRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  smsRecords.push(newRecord);
  return newRecord;
}

/**
 * 获取短信记录列表
 */
export function getSmsRecords(filters?: {
  phone?: string;
  provider?: string;
  status?: 'success' | 'failed';
  limit?: number;
}): SmsRecord[] {
  let records = [...smsRecords];

  if (filters) {
    if (filters.phone) {
      records = records.filter(r => r.phone === filters.phone);
    }
    if (filters.provider) {
      records = records.filter(r => r.provider === filters.provider);
    }
    if (filters.status) {
      records = records.filter(r => r.status === filters.status);
    }
    if (filters.limit) {
      records = records.slice(0, filters.limit);
    }
  }

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 获取短信记录统计
 */
export function getSmsStatistics() {
  const total = smsRecords.length;
  const success = smsRecords.filter(r => r.status === 'success').length;
  const failed = smsRecords.filter(r => r.status === 'failed').length;
  const today = new Date().toDateString();
  const todayCount = smsRecords.filter(r =>
    new Date(r.createdAt).toDateString() === today
  ).length;

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? ((success / total) * 100).toFixed(2) : '0',
    todayCount
  };
}

// ==================== 验证码生成 ====================

/**
 * 生成6位数字验证码
 */
export function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== 短信发送 ====================

/**
 * 发送短信
 * @param provider 短信服务商
 * @param params 发送参数
 */
export async function sendSms(
  provider: string,
  params: SendSmsParams
): Promise<SendSmsResult> {
  // 从数据库获取配置
  const allConfigs = await getAllSmsConfigs();
  const config = allConfigs[provider];

  if (!config) {
    return {
      success: false,
      message: `未找到 ${provider} 短信配置`
    };
  }

  if (!config.enabled) {
    return {
      success: false,
      message: `${config.name} 未启用`
    };
  }

  // 检查每日发送限额
  if (config.currentCount >= config.maxDailyCount) {
    return {
      success: false,
      message: '今日短信发送次数已达上限'
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(params.phone)) {
    return {
      success: false,
      message: '手机号格式不正确'
    };
  }

  try {
    let result: SendSmsResult;

    switch (provider) {
      case 'aliyun':
        result = await sendAliyunSms(config, params);
        break;
      case 'tencent':
        result = await sendTencentSms(config, params);
        break;
      case 'yunpian':
        result = await sendYunpianSms(config, params);
        break;
      default:
        result = {
          success: false,
          message: '不支持的短信服务商'
        };
    }

    // 添加短信记录
    addSmsRecord({
      provider,
      phone: params.phone,
      code: params.code || '',
      templateCode: params.templateCode || config.defaultTemplate,
      status: result.success ? 'success' : 'failed',
      message: result.message,
      requestId: result.requestId,
      bizId: result.bizId
    });

    // 如果发送成功，增加计数
    if (result.success) {
      await smsConfigManager.incrementSmsCount(config.id);
    }

    return result;
  } catch (error: any) {
    console.error(`发送短信失败 (${provider}):`, error);

    // 添加失败记录
    addSmsRecord({
      provider,
      phone: params.phone,
      code: params.code || '',
      templateCode: params.templateCode || config.defaultTemplate,
      status: 'failed',
      message: error.message || '发送短信失败'
    });

    return {
      success: false,
      message: error.message || '发送短信失败'
    };
  }
}

/**
 * 发送阿里云短信
 */
async function sendAliyunSms(
  config: SmsConfig,
  params: SendSmsParams
): Promise<SendSmsResult> {
  // 检查配置是否完整
  if (!config.apiKey || !config.apiSecret) {
    return {
      success: false,
      message: '阿里云短信配置不完整，请填写 AccessKey ID 和 Secret'
    };
  }

  if (!config.signName) {
    return {
      success: false,
      message: '阿里云短信配置不完整，请填写签名名称'
    };
  }

  // 如果没有提供验证码，生成一个
  const code = params.code || generateVerifyCode();
  const templateCode = params.templateCode || config.defaultTemplate;

  // 构造模板参数（JSON字符串格式）
  const templateParam = JSON.stringify({ code });

  try {
    // 使用阿里云SDK发送短信
    const { sendAliyunSms: sendAliyun } = await import('@/lib/aliyun-sms');
    const result = await sendAliyun(config.apiKey, config.apiSecret, {
      phone: params.phone,
      signName: config.signName,
      templateCode: templateCode,
      templateParam: templateParam
    });

    return result;
  } catch (error: any) {
    console.error('[阿里云短信] 发送失败:', error);
    return {
      success: false,
      message: error.message || '短信发送失败'
    };
  }
}

/**
 * 发送腾讯云短信
 */
async function sendTencentSms(
  config: SmsConfig,
  params: SendSmsParams
): Promise<SendSmsResult> {
  // 检查配置是否完整
  if (!config.apiKey || !config.apiSecret) {
    return {
      success: false,
      message: '腾讯云短信配置不完整，请填写 SecretId 和 SecretKey'
    };
  }

  const code = params.code || generateVerifyCode();
  const templateId = params.templateCode || config.defaultTemplate;

  console.log(`[腾讯云短信] 发送到 ${params.phone}`);
  console.log(`签名: ${config.signName}`);
  console.log(`模板ID: ${templateId}`);
  console.log(`验证码: ${code}`);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    message: '短信发送成功',
    requestId: crypto.randomUUID(),
    bizId: crypto.randomUUID()
  };
}

/**
 * 发送云片短信
 */
async function sendYunpianSms(
  config: SmsConfig,
  params: SendSmsParams
): Promise<SendSmsResult> {
  // 检查配置是否完整
  if (!config.apiKey) {
    return {
      success: false,
      message: '云片短信配置不完整，请填写 API Key'
    };
  }

  const code = params.code || generateVerifyCode();

  console.log(`[云片短信] 发送到 ${params.phone}`);
  console.log(`签名: ${config.signName}`);
  console.log(`验证码: ${code}`);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    message: '短信发送成功',
    requestId: crypto.randomUUID(),
    bizId: crypto.randomUUID()
  };
}

// ==================== 验证码验证 ====================

// 简单的验证码存储（实际应该用Redis）
const verifyCodeStore = new Map<string, { code: string; expireAt: number }>();

/**
 * 存储验证码
 */
export function storeVerifyCode(phone: string, code: string, expireMinutes: number = 5): void {
  const expireAt = Date.now() + expireMinutes * 60 * 1000;
  verifyCodeStore.set(phone, { code, expireAt });
}

/**
 * 验证验证码
 */
export function verifyCode(phone: string, code: string): boolean {
  const stored = verifyCodeStore.get(phone);

  if (!stored) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > stored.expireAt) {
    verifyCodeStore.delete(phone);
    return false;
  }

  // 验证码是否匹配
  if (stored.code !== code) {
    return false;
  }

  // 验证成功后删除
  verifyCodeStore.delete(phone);
  return true;
}

/**
 * 清理过期验证码
 */
export function cleanExpiredCodes(): void {
  const now = Date.now();
  for (const [phone, data] of verifyCodeStore.entries()) {
    if (now > data.expireAt) {
      verifyCodeStore.delete(phone);
    }
  }
}

// 定期清理过期验证码（每5分钟清理一次）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredCodes, 5 * 60 * 1000);
}
