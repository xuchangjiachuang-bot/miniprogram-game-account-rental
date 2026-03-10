/**
 * 阿里云短信服务
 */

import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

interface SendSmsParams {
  phone: string;
  signName: string;
  templateCode: string;
  templateParam: string;
}

interface SendSmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  bizId?: string;
  code?: string;
}

/**
 * 发送阿里云短信
 */
export async function sendAliyunSms(
  accessKeyId: string,
  accessKeySecret: string,
  params: SendSmsParams
): Promise<SendSmsResult> {
  try {
    // 创建配置
    const config = new $OpenApi.Config({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com'
    });

    // 创建客户端
    const client = new Dysmsapi(config);

    // 创建请求
    const request = new $Dysmsapi.SendSmsRequest({
      phoneNumbers: params.phone,
      signName: params.signName,
      templateCode: params.templateCode,
      templateParam: params.templateParam
    });

    // 发送请求
    const response = await client.sendSms(request);

    // 检查响应
    if (response.body && response.body.code === 'OK') {
      return {
        success: true,
        message: '短信发送成功',
        requestId: response.body.requestId,
        bizId: response.body.bizId,
        code: response.body.code
      };
    } else {
      return {
        success: false,
        message: response.body?.message || '短信发送失败',
        code: response.body?.code
      };
    }
  } catch (error: any) {
    console.error('阿里云短信发送失败:', error);

    // 尝试从错误中提取信息
    if (error.data && error.data.body) {
      return {
        success: false,
        message: error.data.body.message || error.message,
        code: error.data.body.code
      };
    }

    return {
      success: false,
      message: error.message || '短信发送失败'
    };
  }
}
