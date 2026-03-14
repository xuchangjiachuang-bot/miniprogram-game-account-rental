'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/lib/user-service';
import { clearAuth, getToken } from '@/lib/auth-token';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const USER_CACHE_KEY = 'cached_user';
const USER_CACHE_TIME_KEY = 'user_cache_time';
const USER_CACHE_TTL = 5 * 60 * 1000;

const UserContext = createContext<UserContextType | undefined>(undefined);

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;

  const cachedUser = localStorage.getItem(USER_CACHE_KEY);
  const cacheTime = localStorage.getItem(USER_CACHE_TIME_KEY);
  if (!cachedUser || !cacheTime) {
    return null;
  }

  const timeDiff = Date.now() - Number.parseInt(cacheTime, 10);
  if (!Number.isFinite(timeDiff) || timeDiff >= USER_CACHE_TTL) {
    return null;
  }

  try {
    return JSON.parse(cachedUser) as User;
  } catch (error) {
    console.error('Failed to parse cached user:', error);
    return null;
  }
}

function writeCachedUser(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  localStorage.setItem(USER_CACHE_TIME_KEY, Date.now().toString());
}

function hasAuthCookie() {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie
    .split('; ')
    .some((entry) => entry.startsWith('auth_token='));
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      const cookieLoggedIn = hasAuthCookie();

      if (!token && !cookieLoggedIn) {
        setUser(null);
        clearAuth();
        return;
      }

      if (token) {
        const cachedUser = readCachedUser();
        if (cachedUser) {
          setUser(cachedUser);
          return;
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth', {
        headers,
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        writeCachedUser(data.data);
        return;
      }

      setUser(null);
      clearAuth();
      setError(data.error || '获取用户信息失败');
    } catch (error) {
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
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch('/api/auth', {
        method: 'DELETE',
        headers,
      });
    } catch (error) {
      console.error('Logout failed:', error);
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
