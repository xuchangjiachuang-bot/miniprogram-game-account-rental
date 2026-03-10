import { NextRequest, NextResponse } from 'next/server';
import { getPaymentConfigsByType, deletePaymentConfig, batchSetPaymentConfigs } from '@/lib/payment/config';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const configType = searchParams.get('type') || 'wechat';
    const showSensitive = searchParams.get('show_sensitive') === 'true';

    const configs = await getPaymentConfigsByType(configType);
    const sanitizedConfigs = configs.map((config) => ({
      ...config,
      configValue: showSensitive
        ? config.configValue
        : maskSensitiveValue(config.configKey, config.configValue),
    }));

    return NextResponse.json({ success: true, data: sanitizedConfigs });
  } catch (error: any) {
    console.error('Failed to load payment configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load payment configs' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { success: false, error: 'configs must be an array' },
        { status: 400 }
      );
    }

    const requiredKeys = ['appid', 'mch_id', 'api_key', 'notify_url'];
    const configKeys = configs.map((config: any) => config.configKey);
    const missingKeys = requiredKeys.filter((key) => !configKeys.includes(key));

    if (missingKeys.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required config keys: ${missingKeys.join(', ')}` },
        { status: 400 }
      );
    }

    const results = await batchSetPaymentConfigs(configs);

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Payment configs updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update payment configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update payment configs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const configType = searchParams.get('type') || 'wechat';
    const configKey = searchParams.get('key');

    if (!configKey) {
      return NextResponse.json(
        { success: false, error: 'Missing config key' },
        { status: 400 }
      );
    }

    const result = await deletePaymentConfig(configType, configKey);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Config deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete payment config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete payment config' },
      { status: 500 }
    );
  }
}

function maskSensitiveValue(configKey: string, value: string): string {
  if (!value) return '';

  const sensitiveKeys = ['api_key', 'apikey', 'mp_secret', 'mpsecret', 'secret'];
  if (sensitiveKeys.some((key) => configKey.toLowerCase().includes(key))) {
    if (value.length <= 8) return '***';
    return `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
  }

  const partialKeys = ['appid', 'mch_id', 'mp_appid'];
  if (partialKeys.some((key) => configKey.toLowerCase().includes(key))) {
    if (value.length <= 8) return value;
    return `${value.substring(0, 8)}***`;
  }

  return value;
}
