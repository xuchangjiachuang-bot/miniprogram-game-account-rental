import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq, or } from 'drizzle-orm';
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

interface TokenPayload {
  userId: string;
  version: 1;
  exp: number;
}

const AUTH_TOKEN_VERSION = 1;
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const USERNAME_FALLBACK_PREFIX = 'User';

function getAuthTokenSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.WECHAT_MP_SECRET ||
    process.env.WECHAT_OPEN_APPSECRET ||
    'playground-auth-secret'
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string) {
  return createHmac('sha256', getAuthTokenSecret()).update(payload).digest('base64url');
}

function normalizeUser(row: UserRow): User {
  const userType = (row.userType || 'buyer') as UserType;
  const nickname = row.nickname || row.phone || `${USERNAME_FALLBACK_PREFIX}${row.id.slice(-4)}`;
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
    phone: row.phone || null,
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

async function getUserRowByWechatIdentity(openid: string, unionid?: string) {
  await ensureWechatLoginSchema();
  const condition = unionid
    ? or(eq(users.wechatUnionid, unionid), eq(users.wechatOpenid, openid))
    : eq(users.wechatOpenid, openid);

  const rows = await db.select().from(users).where(condition).limit(5);
  const row = rows.find(isActiveUser);
  return row || null;
}

async function updateUserRow(userId: string, patch: Partial<UserRow>) {
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
  wechatOpenid?: string;
  wechatUnionid?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
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

  const nickname = params.nickname?.trim() || `${USERNAME_FALLBACK_PREFIX}${openid.slice(-4)}`;
  const avatar = params.avatar?.trim() || null;
  const unionid = params.unionid?.trim() || null;

  let row = await getUserRowByWechatIdentity(openid, unionid || undefined);
  if (!row) {
    const phone = await ensureUniqueWechatPhone(openid);
    row = await createUser({
      phone,
      nickname,
      avatar: avatar || undefined,
      userType: 'buyer',
      wechatOpenid: openid,
      wechatUnionid: unionid || undefined,
      wechatNickname: nickname,
      wechatAvatar: avatar || undefined,
    });
  } else {
    row = await updateUserRow(row.id, {
      nickname,
      avatar: avatar || row.avatar,
      wechatOpenid: openid,
      wechatUnionid: unionid || row.wechatUnionid,
      wechatNickname: nickname,
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
