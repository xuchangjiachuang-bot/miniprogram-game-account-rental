import { NextRequest } from 'next/server';
import { getServerUserIdInternal } from '@/lib/user-service';

export function getServerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (tokenFromHeader) {
    return tokenFromHeader;
  }

  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return null;
    }

    const cookiesMap = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    return cookiesMap.auth_token || null;
  } catch (error) {
    console.error('[getServerToken] Failed to get cookies from headers:', error);
    return null;
  }
}

export function getServerUserId(request: NextRequest): string | null {
  const token = getServerToken(request);
  if (!token) {
    return null;
  }

  return getServerUserIdInternal(token);
}
