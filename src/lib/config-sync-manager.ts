/**
 * 全局配置同步管理器
 * 用于监听 SSE 配置更新事件，并触发自定义事件通知所有组件
 */

import { ConfigEventType, ConfigUpdateEvent } from './config-sync';

// 全局配置同步管理器单例
class ConfigSyncManager {
  private eventSource: EventSource | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;
  private listeners: Map<ConfigEventType, Set<(event: ConfigUpdateEvent) => void>> = new Map();

  /**
   * 初始化 SSE 连接
   */
  public init() {
    if (typeof window === 'undefined' || this.isDestroyed) {
      return;
    }

    if (this.eventSource || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.eventSource = new EventSource('/api/homepage/stream');

      this.eventSource.onopen = () => {
        console.log('SSE 配置同步已连接');
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: ConfigUpdateEvent = JSON.parse(event.data);

          // 忽略连接确认消息
          if ((data.type as any) === 'connected') {
            console.log('SSE 配置同步已连接');
            this.isConnecting = false;
            return;
          }

          console.log('收到配置更新:', data);

          // 触发自定义事件（通知所有组件）
          this.dispatchEvent(data);

          // 调用类型特定的监听器
          const typeListeners = this.listeners.get(data.type) || new Set();
          typeListeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('监听器执行失败:', err);
            }
          });

          // 调用 'all' 类型的监听器
          const allListeners = this.listeners.get('all') || new Set();
          allListeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('监听器执行失败:', err);
            }
          });
        } catch (err) {
          console.error('解析 SSE 消息失败:', err);
        }
      };

      this.eventSource.onerror = (err) => {
        const readyState = this.eventSource?.readyState;
        
        // 只在非正常关闭时记录日志
        if (readyState === EventSource.CLOSED) {
          console.log('SSE 连接已关闭');
        } else {
          console.warn(`SSE 连接异常, readyState: ${readyState}`);
        }

        this.disconnect();

        // 如果不是用户主动断开，则尝试重连
        if (!this.isDestroyed && readyState !== EventSource.CLOSED) {
          // 5 秒后尝试重连
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
          }

          this.reconnectTimer = setTimeout(() => {
            console.log('尝试重新连接 SSE...');
            this.reconnectTimer = null;
            this.init();
          }, 5000);
        }
      };

      console.log('SSE 配置同步初始化中...');
    } catch (error) {
      console.error('初始化 SSE 配置同步失败:', error);
      this.isConnecting = false;
    }
  }

  /**
   * 断开 SSE 连接
   */
  public disconnect() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (err) {
        console.error('关闭 SSE 连接失败:', err);
      }
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  /**
   * 销毁 SSE 连接
   */
  public destroy() {
    this.isDestroyed = true;
    this.disconnect();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 触发自定义事件
   */
  private dispatchEvent(event: ConfigUpdateEvent) {
    if (typeof window === 'undefined') return;
    
    try {
      const customEvent = new CustomEvent('config-update', {
        detail: event,
      });
      window.dispatchEvent(customEvent);
    } catch (err) {
      console.error('触发自定义事件失败:', err);
    }
  }

  /**
   * 添加配置更新监听器
   */
  public on(eventType: ConfigEventType, callback: (event: ConfigUpdateEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // 确保 SSE 连接已初始化
    if (!this.eventSource && !this.isConnecting && !this.isDestroyed) {
      // 延迟初始化，确保在客户端执行
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (!this.eventSource && !this.isConnecting && !this.isDestroyed) {
            this.init();
          }
        }, 100);
      }
    }

    // 返回取消订阅函数
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * 移除配置更新监听器
   */
  public off(eventType: ConfigEventType, callback: (event: ConfigUpdateEvent) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 手动刷新配置
   */
  public refresh() {
    // 触发自定义事件，通知所有组件刷新配置
    const event: ConfigUpdateEvent = {
      type: 'all',
      version: Date.now().toString(),
      timestamp: Date.now(),
    };
    this.dispatchEvent(event);
  }
}

// 导出单例
export const configSyncManager = new ConfigSyncManager();

/**
 * React Hook：监听配置更新
 */
import { useEffect, useCallback } from 'react';

export function useConfigUpdate(
  eventType: ConfigEventType,
  callback: (event: ConfigUpdateEvent) => void,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = configSyncManager.on(eventType, callback);
    return () => {
      unsubscribe();
    };
  }, deps);
}

/**
 * React Hook：手动刷新配置
 */
export function useRefreshConfig() {
  const refresh = useCallback(() => {
    configSyncManager.refresh();
  }, []);

  return refresh;
}
