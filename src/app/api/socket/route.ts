/**
 * Socket 服务器 API
 * 用于初始化和管理 WebSocket 连接
 */

import { NextRequest } from 'next/server';
import { createServer } from 'http';
import { initSocketServer } from '@/lib/socket-server';

// 创建独立的 HTTP 服务器用于 Socket
let httpServer: any = null;
let isInitialized = false;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 确保 Socket 服务器只初始化一次
  if (!isInitialized) {
    try {
      // 创建 HTTP 服务器
      httpServer = createServer();

      // 初始化 Socket 服务器
      initSocketServer(httpServer);

      // 启动服务器（监听 3001 端口）
      httpServer.listen(3001, () => {
        console.log('Socket 服务器运行在端口 3001');
      });

      isInitialized = true;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Socket 服务器已启动',
          port: 3001
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('启动 Socket 服务器失败:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: '启动 Socket 服务器失败'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Socket 服务器已运行',
      port: 3001
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// 关闭服务器（仅在开发环境需要）
if (process.env.NODE_ENV === 'development' && typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    if (httpServer) {
      httpServer.close(() => {
        console.log('Socket 服务器已关闭');
        process.exit(0);
      });
    }
  });
}
