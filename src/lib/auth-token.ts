'use client';

const USER_CACHE_KEYS = ['cached_user', 'user_cache_time'] as const;

const clearUserCache = (): void => {
  if (typeof window === 'undefined') return;
  USER_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;

  const previousToken = localStorage.getItem('auth_token');
  if (previousToken !== token) {
    clearUserCache();
  }

  localStorage.setItem('auth_token', token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
};

export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  clearUserCache();
};
