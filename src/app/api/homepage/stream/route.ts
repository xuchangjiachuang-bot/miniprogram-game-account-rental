/**
 * 配置实时推送 SSE 接口
 * GET /api/homepage/stream
 * 
 * 当管理后台更新首页配置时，通过此接口实时推送到所有客户端
 */

import { NextRequest } from 'next/server';
import { addSSEConnection, removeSSEConnection, type ConfigUpdateEvent } from '@/lib/sse-broadcaster';

/**
 * SSE 流式响应
 */
export async function GET(request: NextRequest) {
  // 创建转换流
  const stream = new ReadableStream({
    start(controller) {
      // 发送 SSE 初始化事件
      const initEvent: ConfigUpdateEvent = {
        type: 'connected' as any,
        version: Date.now().toString(),
        timestamp: Date.now(),
      };
      const initData = `data: ${JSON.stringify(initEvent)}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(initData));
      
      // 添加控制器到连接池
      addSSEConnection(controller);

      // 发送心跳包（每 30 秒）
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
          removeSSEConnection(controller);
        }
      }, 30000);

      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        removeSSEConnection(controller);
        try {
          controller.close();
        } catch (error) {
          console.error('关闭 SSE 连接失败:', error);
        }
      });
    },
  });

  // 返回 SSE 响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}
