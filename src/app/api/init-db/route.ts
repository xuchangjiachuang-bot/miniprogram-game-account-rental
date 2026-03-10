import { NextResponse } from 'next/server';
import { ensureDatabaseInitialized } from '@/lib/db';

/**
 * 数据库初始化 API
 * 用于在应用部署后初始化数据库表和默认数据
 */
export async function POST() {
  try {
    await ensureDatabaseInitialized();

    return NextResponse.json({
      success: true,
      message: '数据库初始化完成',
    });
  } catch (error) {
    console.error('[InitDB] 初始化失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '数据库初始化失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法 - 检查数据库状态
 */
export async function GET() {
  try {
    // 这里可以添加数据库连接检查逻辑
    return NextResponse.json({
      success: true,
      message: '数据库 API 可用',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: '数据库连接失败',
      },
      { status: 500 }
    );
  }
}
