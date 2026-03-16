import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, ne, or } from 'drizzle-orm';
import { db, users } from './db';
import { ensureWechatLoginSchema } from './init-wechat-login';
import { ensureUserBalance } from './user-balance-service';

export type UserType = 'buyer' | 'seller' | 'admin';

type UserRow = typeof users.$inferSelect;

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  userType: UserType;
  user_type: UserType;
  userNo: string;
  user_no: string;
  verified: boolean;
  isVerified: boolean;
  isRealNameVerified: boolean;
  realName?: string | null;
  idCard?: string | null;
  status?: string | null;
  createdAt: string | null;
  created_at: string | null;
  updatedAt: string | null;
  updated_at: string | null;
  lastLoginAt?: string | null;
  last_login_at?: string | null;
  wechatOpenid?: string | null;
  wechat_openid?: string | null;
  wechatMpOpenid?: string | null;
  wechat_mp_openid?: string | null;
  wechatOpenPlatformOpenid?: string | null;
  wechat_open_platform_openid?: string | null;
  wechatUnionid?: string | null;
  wechat_unionid?: string | null;
  wechatNickname?: string | null;
  wechat_nickname?: string | null;
  wechatAvatar?: string | null;
  wechat_avatar?: string | null;
}

export interface WechatLoginParams {
  openid: string;
  nickname?: string;
  avatar?: string;
  unionid?: string;
  source?: 'mp' | 'open';
}

export interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface UpdateUserProfileParams {
  nickname?: string;
  phone?: string;
  email?: string | null;
  avatar?: string | null;
}

interface TokenPayload {
  userId: string;
  version: 1;
  exp: number;
}

interface WechatIdentityPatch {
  wechatOpenid?: string | null;
  wechatMpOpenid?: string | null;
  wechatOpenPlatformOpenid?: string | null;
}

const AUTH_TOKEN_VERSION = 1;
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const USERNAME_FALLBACK_PREFIX = 'User';
const USER_NICKNAME_MAX_LENGTH = 50;
const WECHAT_NICKNAME_MAX_LENGTH = 100;
const WECHAT_AVATAR_MAX_LENGTH = 500;

function getAuthTokenSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.WECHAT_MP_SECRET ||
    process.env.WECHAT_OPEN_APPSECRET ||
    'playground-auth-secret'
  );
}

function toBase64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;

  if (padding === 0) {
    return normalized;
  }

  return normalized.padEnd(normalized.length + (4 - padding), '=');
}

function base64UrlEncode(value: string) {
  return toBase64Url(Buffer.from(value, 'utf8').toString('base64'));
}

function base64UrlDecode(value: string) {
  return Buffer.from(fromBase64Url(value), 'base64').toString('utf8');
}

function signPayload(payload: string) {
  return toBase64Url(createHmac('sha256', getAuthTokenSecret()).update(payload).digest('base64'));
}

function trimToLength(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeWechatNickname(nickname: string | undefined, openid: string) {
  const fallback = `${USERNAME_FALLBACK_PREFIX}${openid.slice(-4)}`;
  const safeNickname = trimToLength(nickname, USER_NICKNAME_MAX_LENGTH);
  const safeWechatNickname = trimToLength(nickname, WECHAT_NICKNAME_MAX_LENGTH);

  return {
    nickname: safeNickname || fallback,
    wechatNickname: safeWechatNickname || fallback,
  };
}

function normalizeWechatAvatar(avatar: string | undefined) {
  return trimToLength(avatar, WECHAT_AVATAR_MAX_LENGTH);
}

function isPlaceholderWechatPhone(phone: string | null | undefined) {
  if (!phone) {
    return false;
  }

  return /^(wx|wechat)_[a-z0-9]+$/i.test(phone.trim());
}

function normalizeUser(row: UserRow): User {
  const userType = (row.userType || 'buyer') as UserType;
  const displayPhone = isPlaceholderWechatPhone(row.phone) ? null : row.phone || null;
  const nickname = row.nickname || displayPhone || `${USERNAME_FALLBACK_PREFIX}${row.id.slice(-4)}`;
  const createdAt = row.createdAt || null;
  const updatedAt = row.updatedAt || null;
  const lastLoginAt = row.lastLoginAt || null;
  const verified = Boolean(row.isVerified);

  return {
    id: row.id,
    username: nickname,
    nickname,
    avatar: row.avatar || row.wechatAvatar || null,
    email: row.email || null,
    phone: displayPhone,
    userType,
    user_type: userType,
    userNo: row.id,
    user_no: row.id,
    verified,
    isVerified: verified,
    isRealNameVerified: verified,
    realName: row.realName || null,
    idCard: row.idCard || null,
    status: row.status || null,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
    lastLoginAt,
    last_login_at: lastLoginAt,
    wechatOpenid: row.wechatOpenid || null,
    wechat_openid: row.wechatOpenid || null,
    wechatMpOpenid: row.wechatMpOpenid || null,
    wechat_mp_openid: row.wechatMpOpenid || null,
    wechatOpenPlatformOpenid: row.wechatOpenPlatformOpenid || null,
    wechat_open_platform_openid: row.wechatOpenPlatformOpenid || null,
    wechatUnionid: row.wechatUnionid || null,
    wechat_unionid: row.wechatUnionid || null,
    wechatNickname: row.wechatNickname || null,
    wechat_nickname: row.wechatNickname || null,
    wechatAvatar: row.wechatAvatar || null,
    wechat_avatar: row.wechatAvatar || null,
  };
}

function isActiveUser(row: UserRow | undefined) {
  return Boolean(row && !row.isDeleted && row.status !== 'disabled' && row.status !== 'deleted');
}

function buildWechatPlaceholderPhone(openid: string) {
  const timestamp = Date.now().toString().slice(-8);
  return `wx_${timestamp}${openid.slice(0, 8)}`.slice(0, 20);
}

async function ensureUniqueWechatPhone(openid: string) {
  const base = buildWechatPlaceholderPhone(openid);
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await db.select().from(users).where(eq(users.phone, candidate)).limit(1);
    if (existing.length === 0) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base.slice(0, 18)}${suffix}`.slice(0, 20);
  }
}

async function getUserRowById(userId: string) {
  await ensureWechatLoginSchema();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const row = rows[0];
  return isActiveUser(row) ? row : null;
}

function matchesSourceOpenid(row: UserRow, openid: string, source: 'mp' | 'open') {
  if (source === 'mp') {
    return row.wechatMpOpenid === openid || row.wechatOpenid === openid;
  }

  return row.wechatOpenPlatformOpenid === openid || row.wechatOpenid === openid;
}

async function getUserRowsByWechatIdentity(openid: string, source: 'mp' | 'open', unionid?: string) {
  await ensureWechatLoginSchema();
  const conditions = source === 'mp'
    ? [eq(users.wechatMpOpenid, openid), eq(users.wechatOpenid, openid)]
    : [eq(users.wechatOpenPlatformOpenid, openid), eq(users.wechatOpenid, openid)];

  if (unionid) {
    conditions.push(eq(users.wechatUnionid, unionid));
  }

  const rows = await db.select().from(users).where(or(...conditions)).limit(10);
  return rows.filter(isActiveUser);
}

type UserRowPatch = Omit<
  Partial<UserRow>,
  | 'email'
  | 'avatar'
  | 'wechatOpenid'
  | 'wechatMpOpenid'
  | 'wechatOpenPlatformOpenid'
  | 'wechatUnionid'
  | 'wechatNickname'
  | 'wechatAvatar'
> & {
  email?: string | null;
  avatar?: string | null;
  wechatOpenid?: string | null;
  wechatMpOpenid?: string | null;
  wechatOpenPlatformOpenid?: string | null;
  wechatUnionid?: string | null;
  wechatNickname?: string | null;
  wechatAvatar?: string | null;
};

async function updateUserRow(userId: string, patch: UserRowPatch) {
  await ensureWechatLoginSchema();
  const [updated] = await db
    .update(users)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updated || null;
}

export async function updateUserProfile(userId: string, params: UpdateUserProfileParams): Promise<User> {
  const currentRow = await getUserRowById(userId);
  if (!currentRow) {
    throw new Error('USER_NOT_FOUND');
  }

  const nickname = trimToLength(params.nickname ?? currentRow.nickname, USER_NICKNAME_MAX_LENGTH);
  const nextPhoneInput = params.phone === undefined ? currentRow.phone : params.phone;
  const phone = trimToLength(nextPhoneInput, 20);
  const email = trimToLength(params.email ?? currentRow.email, 100);
  const avatar = trimToLength(params.avatar ?? currentRow.avatar, WECHAT_AVATAR_MAX_LENGTH);

  if (!nickname) {
    throw new Error('INVALID_NICKNAME');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('INVALID_EMAIL');
  }

  if (phone) {
    const duplicatedPhoneRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, phone), ne(users.id, userId)))
      .limit(1);

    if (duplicatedPhoneRows.length > 0) {
      throw new Error('PHONE_ALREADY_USED');
    }
  }

  const updatedRow = await updateUserRow(userId, {
    nickname,
    phone: params.phone === undefined ? undefined : (phone || currentRow.phone),
    email,
    avatar,
  });

  if (!updatedRow) {
    throw new Error('PROFILE_UPDATE_FAILED');
  }

  return normalizeUser(updatedRow);
}

function buildIdentityPatch(openid: string, source: 'mp' | 'open', row?: UserRow | null): WechatIdentityPatch {
  if (source === 'mp') {
    return {
      wechatOpenid: openid,
      wechatMpOpenid: openid,
    };
  }

  const shouldClearLegacyOpenid = row?.wechatOpenid === openid && !row.wechatMpOpenid;
  return {
    wechatOpenPlatformOpenid: openid,
    ...(shouldClearLegacyOpenid ? { wechatOpenid: null } : {}),
  };
}

async function releaseDuplicateWechatIdentity(row: UserRow, source: 'mp' | 'open') {
  const patch: Partial<UserRow> = {
    wechatUnionid: null,
  };

  if (source === 'mp') {
    patch.wechatMpOpenid = null;
    patch.wechatOpenid = null;
  } else {
    patch.wechatOpenPlatformOpenid = null;
    if (!row.wechatMpOpenid) {
      patch.wechatOpenid = null;
    }
  }

  await updateUserRow(row.id, patch);
}

async function resolveWechatLoginTarget(openid: string, source: 'mp' | 'open', unionid?: string | null) {
  const rows = await getUserRowsByWechatIdentity(openid, source, unionid || undefined);
  const unionRow = unionid ? rows.find((row) => row.wechatUnionid === unionid) || null : null;
  const openidRow = rows.find((row) => matchesSourceOpenid(row, openid, source)) || null;
  const primary = unionRow || openidRow || rows[0] || null;

  if (!primary) {
    return null;
  }

  const duplicates = rows.filter((row) => row.id !== primary.id);
  for (const duplicate of duplicates) {
    if (unionid && (duplicate.wechatUnionid === unionid || matchesSourceOpenid(duplicate, openid, source))) {
      await releaseDuplicateWechatIdentity(duplicate, source);
    }
  }

  return primary;
}

async function ensurePersistentUserState(row: UserRow | null) {
  if (!row) {
    return null;
  }

  await ensureUserBalance(row.id);
  return row;
}

function generateTokenPayload(userId: string): TokenPayload {
  return {
    userId,
    version: AUTH_TOKEN_VERSION,
    exp: Math.floor(Date.now() / 1000) + AUTH_TOKEN_TTL_SECONDS,
  };
}

export function generateToken(userId: string): string {
  const payload = base64UrlEncode(JSON.stringify(generateTokenPayload(userId)));
  const signature = signPayload(payload);
  return `${AUTH_TOKEN_VERSION}.${payload}.${signature}`;
}

export function getServerUserIdInternal(token: string): string | null {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const [version, payload, signature] = cleanToken.split('.');
    if (!version || !payload || !signature || Number(version) !== AUTH_TOKEN_VERSION) {
      return null;
    }

    const expectedSignature = signPayload(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (!parsed.userId || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed.userId;
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  const userId = getServerUserIdInternal(token);
  if (!userId) {
    return null;
  }

  const row = await getUserRowById(userId);
  return row ? normalizeUser(row) : null;
}

export function resolveWechatWithdrawalOpenid(user: Partial<User> | null | undefined) {
  if (!user) {
    return null;
  }

  return user.wechat_openid
    || user.wechat_mp_openid
    || user.wechat_open_platform_openid
    || user.wechatOpenid
    || user.wechatMpOpenid
    || user.wechatOpenPlatformOpenid
    || null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const row = await getUserRowById(userId);
  return row ? normalizeUser(row) : null;
}

async function createUser(params: {
  phone: string;
  nickname?: string;
  avatar?: string;
  userType?: UserType;
  email?: string;
  realName?: string;
  idCard?: string;
  wechatOpenid?: string | null;
  wechatMpOpenid?: string | null;
  wechatOpenPlatformOpenid?: string | null;
  wechatUnionid?: string | null;
  wechatNickname?: string | null;
  wechatAvatar?: string | null;
}) {
  await ensureWechatLoginSchema();
  const nickname =
    params.nickname?.trim() || params.phone || `${USERNAME_FALLBACK_PREFIX}${Date.now().toString().slice(-4)}`;

  const [created] = await db
    .insert(users)
    .values({
      phone: params.phone,
      nickname,
      avatar: params.avatar || params.wechatAvatar || null,
      email: params.email || null,
      realName: params.realName || null,
      idCard: params.idCard || null,
      userType: params.userType || 'buyer',
      lastLoginAt: new Date().toISOString(),
      wechatOpenid: params.wechatOpenid || null,
      wechatMpOpenid: params.wechatMpOpenid || null,
      wechatOpenPlatformOpenid: params.wechatOpenPlatformOpenid || null,
      wechatUnionid: params.wechatUnionid || null,
      wechatNickname: params.wechatNickname || null,
      wechatAvatar: params.wechatAvatar || null,
    })
    .returning();

  return ensurePersistentUserState(created || null);
}

export async function wechatLogin(params: WechatLoginParams): Promise<LoginResult> {
  const openid = params.openid?.trim();
  if (!openid) {
    return { success: false, message: 'MISSING_OPENID' };
  }

  const source = params.source === 'open' ? 'open' : 'mp';
  const { nickname, wechatNickname } = normalizeWechatNickname(params.nickname, openid);
  const avatar = normalizeWechatAvatar(params.avatar);
  const unionid = params.unionid?.trim() || null;
  const identityPatch = buildIdentityPatch(openid, source);

  let row = await resolveWechatLoginTarget(openid, source, unionid);
  if (!row) {
    const phone = await ensureUniqueWechatPhone(openid);
    row = await createUser({
      phone,
      nickname,
      avatar: avatar || undefined,
      userType: 'buyer',
      ...identityPatch,
      wechatUnionid: unionid || undefined,
      wechatNickname: wechatNickname,
      wechatAvatar: avatar || undefined,
    });
  } else {
    row = await updateUserRow(row.id, {
      nickname,
      avatar: avatar || row.avatar,
      ...buildIdentityPatch(openid, source, row),
      wechatUnionid: unionid || row.wechatUnionid,
      wechatNickname: wechatNickname,
      wechatAvatar: avatar || row.wechatAvatar,
      lastLoginAt: new Date().toISOString(),
    });
  }

  row = await ensurePersistentUserState(row);
  if (!row) {
    return { success: false, message: 'WECHAT_LOGIN_FAILED' };
  }

  return {
    success: true,
    message: 'LOGIN_SUCCESS',
    token: generateToken(row.id),
    user: normalizeUser(row),
  };
}

export function logoutUser(_token: string): boolean {
  return true;
}
