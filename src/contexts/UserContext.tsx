'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/user-service';
import { getToken, setToken, removeToken, clearAuth } from '@/lib/auth-token';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // 从 localStorage 获取 token
      const token = getToken();
      
      // 如果没有 token，直接返回未登录
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // 检查 localStorage 缓存
      const cachedUser = localStorage.getItem('cached_user');
      const cacheTime = localStorage.getItem('user_cache_time');
      
      // 如果有缓存且未过期（5分钟内），直接使用缓存
      if (cachedUser && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff < 5 * 60 * 1000) {
          try {
            setUser(JSON.parse(cachedUser));
            setLoading(false);
            return;
          } catch (e) {
            console.error('缓存解析失败:', e);
          }
        }
      }

      // 从服务器获取最新用户信息，通过 header 发送 token
      const response = await fetch('/api/auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        // 缓存用户信息
        localStorage.setItem('cached_user', JSON.stringify(data.data));
        localStorage.setItem('user_cache_time', Date.now().toString());
      } else {
        setUser(null);
        // 清除所有认证数据
        clearAuth();
        setError(data.error || '获取用户信息失败');
      }
    } catch (err) {
      setUser(null);
      clearAuth();
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = getToken();
      if (token) {
        await fetch('/api/auth', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (err) {
      console.error('退出登录失败:', err);
    } finally {
      setUser(null);
      setError(null);
      clearAuth();
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
