import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库操作
const config: Record<string, any> = {
  commission_rate: '5',
  withdrawal_fee_ratio: '1',
  min_rental_price: '50',
  deposit_ratio: '50',
  coins_per_day: '10',
  min_rental_hours: '24',
  max_coins_per_account: '1000',
  max_deposit: '10000',
  require_manual_review: 'true',
  auto_approve_verified: 'false'
};

/**
 * 获取平台配置
 * GET /api/config
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key) {
      // 获取单个配置
      const value = config[key];
      if (value === undefined) {
        return NextResponse.json({
          success: false,
          error: '配置项不存在'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          key,
          value,
          type: typeof value === 'boolean' ? 'boolean' : 'number'
        }
      });
    }
    
    // 获取所有配置
    const configData = Object.entries(config).map(([key, value]) => ({
      key,
      value,
      type: typeof value === 'boolean' ? 'boolean' : 'number'
    }));
    
    return NextResponse.json({
      success: true,
      data: configData
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 更新平台配置
 * PUT /api/config
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }
    
    // 检查配置项是否存在
    if (!(key in config)) {
      return NextResponse.json({
        success: false,
        error: '配置项不存在'
      }, { status: 404 });
    }
    
    // 更新配置
    config[key] = String(value);
    
    return NextResponse.json({
      success: true,
      message: '配置已更新',
      data: {
        key,
        value: config[key]
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
