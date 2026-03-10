/**
 * 实名认证服务
 * 支持多种第三方身份验证服务
 */

// ==================== 类型定义 ====================

export interface VerificationResult {
  success: boolean;
  passed: boolean;
  message: string;
  data?: {
    realName?: string;
    idCard?: string;
    verifiedAt?: string;
  };
}

export interface InitiateVerificationParams {
  realName: string;
  idCard: string;
  service?: 'aliyun' | 'tencent' | 'mock';
}

// ==================== 服务实现 ====================

/**
 * 初始化实名认证
 * 返回认证Token和认证URL
 */
export async function initiateVerification(
  params: InitiateVerificationParams
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  const { realName, idCard, service = 'mock' } = params;

  try {
    // 简单验证姓名和身份证格式
    if (!realName || realName.length < 2 || realName.length > 20) {
      return {
        success: false,
        error: '姓名格式不正确'
      };
    }

    // 验证身份证格式（18位）
    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)) {
      return {
        success: false,
        error: '身份证号码格式不正确'
      };
    }

    switch (service) {
      case 'aliyun':
        return await initiateAliyunVerification(realName, idCard);
      case 'tencent':
        return await initiateTencentVerification(realName, idCard);
      case 'mock':
      default:
        return await initiateMockVerification(realName, idCard);
    }
  } catch (error: any) {
    console.error('初始化实名认证失败:', error);
    return {
      success: false,
      error: error.message || '初始化认证失败'
    };
  }
}

/**
 * 查询认证结果
 */
export async function getVerificationResult(
  token: string,
  service: string = 'mock'
): Promise<VerificationResult> {
  try {
    switch (service) {
      case 'aliyun':
        return await getAliyunVerificationResult(token);
      case 'tencent':
        return await getTencentVerificationResult(token);
      case 'mock':
      default:
        return await getMockVerificationResult(token);
    }
  } catch (error: any) {
    console.error('查询认证结果失败:', error);
    return {
      success: false,
      passed: false,
      message: error.message || '查询认证结果失败'
    };
  }
}

// ==================== 阿里云实名认证 ====================

/**
 * 初始化阿里云实名认证
 */
async function initiateAliyunVerification(
  realName: string,
  idCard: string
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  try {
    // 检查环境变量
    if (!process.env.ALIYUN_ACCESS_KEY_ID || !process.env.ALIYUN_ACCESS_KEY_SECRET) {
      console.warn('阿里云认证未配置，使用模拟模式');
      return await initiateMockVerification(realName, idCard);
    }

    // 动态导入阿里云SDK
    const CloudAuth = (await import('@alicloud/cloudauth20190307')).default;
    const OpenApi = (await import('@alicloud/openapi-client')).default;
    const $OpenApi = await import('@alicloud/openapi-client');

    // 创建客户端
    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: 'cloudauth.aliyuncs.com',
      regionId: 'cn-hangzhou'
    });

    const client = new CloudAuth(config);

    // 获取认证Token
    const request = {
      sceneId: process.env.ALIYUN_FACE_SCENE_ID,
      outerOrderNo: `VERIFY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // @ts-ignore
    const response = await client.describeVerifyToken(request);

    // @ts-ignore
    if (!response.body?.token) {
      throw new Error('获取认证Token失败');
    }

    // @ts-ignore
    return {
      success: true,
      token: response.body.token,
      url: `https://cloudauth.aliyun.com/?token=${response.body.token}`
    };
  } catch (error: any) {
    console.error('阿里云认证初始化失败:', error);
    // 降级到模拟模式
    return await initiateMockVerification(realName, idCard);
  }
}

/**
 * 查询阿里云认证结果
 */
async function getAliyunVerificationResult(token: string): Promise<VerificationResult> {
  try {
    const CloudAuth = (await import('@alicloud/cloudauth20190307')).default;
    const $OpenApi = await import('@alicloud/openapi-client');

    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'cloudauth.aliyuncs.com',
      regionId: 'cn-hangzhou'
    });

    const client = new CloudAuth(config);

    const request = { token };

    // @ts-ignore
    const response = await client.describeVerifyResult(request);

    // @ts-ignore
    const result = response.body;

    return {
      success: true,
      passed: result?.passed || false,
      message: result?.passed ? '认证成功' : '认证失败',
      data: {
        realName: result?.materialInfo?.realName,
        idCard: result?.materialInfo?.idNumber,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('查询阿里云认证结果失败:', error);
    return {
      success: false,
      passed: false,
      message: error.message || '查询认证结果失败'
    };
  }
}

// ==================== 腾讯云实名认证 ====================

/**
 * 初始化腾讯云实名认证
 */
async function initiateTencentVerification(
  realName: string,
  idCard: string
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  // 腾讯云认证实现（类似阿里云）
  console.warn('腾讯云认证暂未实现，使用模拟模式');
  return await initiateMockVerification(realName, idCard);
}

/**
 * 查询腾讯云认证结果
 */
async function getTencentVerificationResult(token: string): Promise<VerificationResult> {
  console.warn('腾讯云认证暂未实现');
  return {
    success: false,
    passed: false,
    message: '功能暂未实现'
  };
}

// ==================== 模拟实名认证（用于测试） ====================

// 存储模拟的认证结果
const mockVerificationResults = new Map<string, {
  realName: string;
  idCard: string;
  timestamp: number;
}>();

/**
 * 初始化模拟实名认证
 */
async function initiateMockVerification(
  realName: string,
  idCard: string
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  // 生成模拟Token
  const token = `MOCK_VERIFY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 存储模拟数据
  mockVerificationResults.set(token, {
    realName,
    idCard,
    timestamp: Date.now()
  });

  return {
    success: true,
    token,
    url: `/verification/mock?token=${token}`
  };
}

/**
 * 查询模拟认证结果
 */
async function getMockVerificationResult(token: string): Promise<VerificationResult> {
  const data = mockVerificationResults.get(token);

  if (!data) {
    return {
      success: false,
      passed: false,
      message: '认证Token无效或已过期'
    };
  }

  // 模拟认证通过
  return {
    success: true,
    passed: true,
    message: '认证成功',
    data: {
      realName: data.realName,
      idCard: maskIdCard(data.idCard),
      verifiedAt: new Date().toISOString()
    }
  };
}

// ==================== 工具函数 ====================

/**
 * 身份证号脱敏
 */
function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 18) return idCard;
  return `${idCard.substring(0, 6)}********${idCard.substring(14)}`;
}

/**
 * 姓名脱敏
 */
export function maskName(name: string): string {
  if (!name || name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/**
 * 验证身份证格式
 */
export function validateIdCard(idCard: string): boolean {
  return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard);
}

/**
 * 验证姓名格式
 */
export function validateName(name: string): boolean {
  return /^[a-zA-Z\u4e00-\u9fa5]{2,20}$/.test(name);
}
