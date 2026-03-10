import { NextRequest, NextResponse } from 'next/server';
import { smsConfigManager } from '@/storage/database/smsConfigManager';
import { ensureSmsConfigsInitialized } from '@/lib/db';
import { clearSmsConfigCache } from '@/lib/sms-service';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    await ensureSmsConfigsInitialized();
    const configs = await smsConfigManager.getAllSmsConfigs();
    const configArray = Object.entries(configs).map(([key, config]) => ({
      ...config,
      key,
    }));

    return NextResponse.json({ success: true, data: configArray });
  } catch (error: any) {
    console.error('Failed to load SMS configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load SMS configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    await ensureSmsConfigsInitialized();
    const body = await request.json();

    const {
      provider,
      apiKey,
      apiSecret,
      signName,
      endpoint,
      enabled,
      defaultTemplate,
      maxDailyCount,
    } = body;

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Missing provider' },
        { status: 400 }
      );
    }

    const validProviders = ['aliyun', 'tencent', 'yunpian'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const allConfigs = await smsConfigManager.getAllSmsConfigs();
    const currentConfig = allConfigs[provider as keyof typeof allConfigs];

    const updatedConfig = {
      ...currentConfig,
      apiKey: apiKey !== undefined ? apiKey : currentConfig.apiKey,
      apiSecret: apiSecret !== undefined ? apiSecret : currentConfig.apiSecret,
      signName: signName !== undefined ? signName : currentConfig.signName,
      endpoint: endpoint !== undefined ? endpoint : currentConfig.endpoint,
      enabled: enabled !== undefined ? enabled : currentConfig.enabled,
      defaultTemplate: defaultTemplate !== undefined ? defaultTemplate : currentConfig.defaultTemplate,
      maxDailyCount: maxDailyCount !== undefined ? maxDailyCount : currentConfig.maxDailyCount,
    };

    const success = await smsConfigManager.updateSmsConfig(provider, updatedConfig);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update SMS config' },
        { status: 500 }
      );
    }

    clearSmsConfigCache();

    return NextResponse.json({
      success: true,
      message: 'SMS config saved',
      data: updatedConfig,
    });
  } catch (error: any) {
    console.error('Failed to save SMS config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save SMS config' },
      { status: 500 }
    );
  }
}
