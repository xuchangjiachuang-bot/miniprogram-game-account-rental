import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemConfig } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

/**
 * 检查微信登录状态
 * GET /api/auth/wechat/check-login?state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    console.log('[检查登录状态] state:', state);

    if (!state) {
      return NextResponse.json({
        success: false,
        error: '缺少state参数'
      }, { status: 400 });
    }

    const key = `wechat_login_${state}`;
    
    // 直接查询数据库
    const records = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, key))
      .limit(1);

    console.log('[检查登录状态] 查询结果:', records.length, '条');

    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        loggedIn: false
      });
    }

    const record = records[0];
    console.log('[检查登录状态] 原始数据:', record.configValue, '类型:', typeof record.configValue);
    
    let data: any;
    if (typeof record.configValue === 'string') {
      data = JSON.parse(record.configValue);
    } else {
      data = record.configValue;
    }

    const STATE_EXPIRE_TIME = 5 * 60 * 1000;
    
    // 检查是否过期
    if (Date.now() - data.createdAt > STATE_EXPIRE_TIME) {
      console.log('[检查登录状态] 数据已过期，删除');
      await db
        .delete(systemConfig)
        .where(eq(systemConfig.configKey, key));
      return NextResponse.json({
        success: true,
        loggedIn: false
      });
    }

    if (data && data.loggedIn) {
      // 登录成功，清除状态
      await db
        .delete(systemConfig)
        .where(eq(systemConfig.configKey, key));

      return NextResponse.json({
        success: true,
        loggedIn: true,
        token: data.token
      });
    }

    return NextResponse.json({
      success: true,
      loggedIn: false
    });
  } catch (error: any) {
    console.error('[检查登录状态] 失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '检查登录状态失败'
    }, { status: 500 });
  }
}
