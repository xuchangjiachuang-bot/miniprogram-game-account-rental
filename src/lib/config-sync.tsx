/**
 * 配置同步管理工具
 * 实现管理后台和前端的配置信息实时同步
 * 
 * 最佳实践：
 * 1. localStorage 作为缓存层（秒级加载）
 * 2. SSE 实时推送（配置变更后立即通知）
 * 3. 配置版本号机制（避免重复刷新）
 * 4. React Context + hooks 管理全局配置状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// 配置缓存键
export const CONFIG_CACHE_KEY = 'hafcoin_homepage_config';
export const CONFIG_VERSION_KEY = 'hafcoin_config_version';
const LEGACY_CONFIG_KEYS = ['homepage_config', 'homepage_logos', 'skin_config'] as const;

// 配置更新事件类型
export type ConfigEventType = 'logo' | 'skin' | 'announcement' | 'settings' | 'all';

// 配置更新事件
export interface ConfigUpdateEvent {
  type: ConfigEventType;
  version: string;
  timestamp: number;
}

/**
 * 从 localStorage 读取缓存配置
 */
export function loadConfigFromCache<T>(): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('读取缓存配置失败:', error);
  }
  return null;
}

/**
 * 保存配置到 localStorage 缓存
 */
export function saveConfigToCache<T>(config: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    localStorage.setItem(CONFIG_VERSION_KEY, Date.now().toString());
    LEGACY_CONFIG_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('保存缓存配置失败:', error);
  }
}

/**
 * 获取配置版本号
 */
export function getConfigVersion(): string {
  if (typeof window === 'undefined') return '0';
  
  return localStorage.getItem(CONFIG_VERSION_KEY) || '0';
}

/**
 * 检查配置是否需要更新
 */
export function shouldUpdateConfig(serverVersion: string): boolean {
  const cachedVersion = getConfigVersion();
  return serverVersion !== cachedVersion;
}

/**
 * 配置同步 Hook
 * 
 * 功能：
 * 1. 优先从 localStorage 加载配置（秒级）
 * 2. 自动从服务器获取最新配置
 * 3. 监听 SSE 配置更新事件
 * 4. 版本控制，避免重复刷新
 */
export function useConfigSync<T>(
  fetchConfig: () => Promise<T>,
  options?: {
    /** 是否启用自动刷新，默认 true */
    autoRefresh?: boolean;
    /** 自动刷新间隔（毫秒），默认 5 分钟 */
    refreshInterval?: number;
    /** 是否启用 SSE 实时推送，默认 true */
    enableSSE?: boolean;
    /** 配置变更回调 */
    onConfigChange?: (config: T, event: ConfigEventType) => void;
  }
) {
  const {
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 分钟
    enableSSE = true,
    onConfigChange,
  } = options || {};

  const [config, setConfig] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState<string>(getConfigVersion());
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 从服务器获取配置
  const fetchFromServer = useCallback(async (): Promise<T | null> => {
    if (!isMountedRef.current) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const serverConfig = await fetchConfig();
      
      // 检查版本是否更新
      const serverVersion = Date.now().toString();
      const shouldUpdate = shouldUpdateConfig(serverVersion);
      
      if (shouldUpdate || !config) {
        // 更新配置
        setConfig(serverConfig);
        setVersion(serverVersion);
        
        // 保存到缓存
        saveConfigToCache(serverConfig);
      }
      
      return serverConfig;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
      console.error('获取配置失败:', err);
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchConfig, config]);

  // 初始化配置
  useEffect(() => {
    isMountedRef.current = true;

    // 1. 优先从缓存加载
    const cachedConfig = loadConfigFromCache<T>();
    if (cachedConfig) {
      setConfig(cachedConfig);
    }

    // 2. 异步获取最新配置
    fetchFromServer();

    // 3. 自动刷新配置
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchFromServer();
      }, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchFromServer]);

  // SSE 实时推送
  useEffect(() => {
    if (!enableSSE || typeof window === 'undefined') return;

    // 建立 SSE 连接
    const eventSource = new EventSource('/api/homepage/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: ConfigUpdateEvent = JSON.parse(event.data);
        
        if (!isMountedRef.current) return;
        
        // 收到配置更新通知
        console.log('收到配置更新:', data);
        
        // 获取最新配置
        fetchFromServer().then((newConfig) => {
          if (newConfig && onConfigChange) {
            onConfigChange(newConfig, data.type);
          }
        });
        
        // 更新版本号
        setVersion(data.version);
      } catch (err) {
        console.error('解析 SSE 消息失败:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE 连接错误:', err);
      eventSource.close();
      
      // 5 秒后尝试重连
      setTimeout(() => {
        if (isMountedRef.current && enableSSE) {
          // 重新建立连接
          const newEventSource = new EventSource('/api/homepage/stream');
          eventSourceRef.current = newEventSource;
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [enableSSE, fetchFromServer, onConfigChange]);

  // 手动刷新配置
  const refresh = useCallback(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  return {
    config,
    loading,
    error,
    version,
    refresh,
  };
}

/**
 * 配置同步提供器（用于全局配置管理）
 */
import { createContext, useContext, ReactNode } from 'react';

interface ConfigSyncContextValue<T> {
  config: T | null;
  loading: boolean;
  error: Error | null;
  version: string;
  refresh: () => void;
}

const ConfigSyncContext = createContext<ConfigSyncContextValue<any> | null>(null);

export function ConfigSyncProvider<T>({
  children,
  fetchConfig,
  options,
}: {
  children: ReactNode;
  fetchConfig: () => Promise<T>;
  options?: Parameters<typeof useConfigSync>[1];
}) {
  const configSync = useConfigSync(fetchConfig, options);

  return (
    <ConfigSyncContext.Provider value={configSync}>
      {children}
    </ConfigSyncContext.Provider>
  );
}

export function useConfig<T = any>() {
  const context = useContext(ConfigSyncContext);
  
  if (!context) {
    throw new Error('useConfig must be used within ConfigSyncProvider');
  }
  
  return context as ConfigSyncContextValue<T>;
}

/**
 * 皮肤配置工具函数
 */
export function loadSkinsFromCache(): any[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const cached = loadConfigFromCache<any>();
    if (Array.isArray(cached?.skinOptions)) {
      return cached.skinOptions;
    }
    if (Array.isArray(cached?.skins)) {
      return cached.skins;
    }
  } catch (error) {
    console.error('读取缓存皮肤配置失败:', error);
  }
  return [];
}

/**
 * LOGO 配置工具函数
 */
export function loadLogoFromCache(): any {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = loadConfigFromCache<any>();
    if (Array.isArray(cached?.logos) && cached.logos.length > 0) {
      return cached.logos[0];
    }
    if (cached?.logo) {
      return cached.logo;
    }
  } catch (error) {
    console.error('读取缓存LOGO配置失败:', error);
  }
  return null;
}

/**
 * 系统公告配置工具函数
 */
export function loadAnnouncementFromCache(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    const cached = loadConfigFromCache<any>();
    if (cached?.announcement) {
      return cached.announcement;
    }
  } catch (error) {
    console.error('读取缓存系统公告失败:', error);
  }
  return '';
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CONFIG_CACHE_KEY);
    localStorage.removeItem(CONFIG_VERSION_KEY);
    LEGACY_CONFIG_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('清除配置缓存失败:', error);
  }
}
