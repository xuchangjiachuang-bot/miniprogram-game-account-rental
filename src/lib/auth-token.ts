'use client';

const USER_CACHE_KEYS = ['cached_user', 'user_cache_time'] as const;

const clearUserCache = (): void => {
  if (typeof window === 'undefined') return;
  USER_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const getCookieToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith('auth_token='));

  if (!entry) {
    return null;
  }

  const rawValue = entry.slice('auth_token='.length);
  return rawValue || null;
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const localToken = localStorage.getItem('auth_token');
  if (localToken) {
    return localToken;
  }

  const cookieToken = getCookieToken();
  if (cookieToken) {
    localStorage.setItem('auth_token', cookieToken);
    return cookieToken;
  }

  return null;
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
