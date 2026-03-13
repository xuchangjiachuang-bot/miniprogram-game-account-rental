/**
 * 用户服务
 * 处理用户注册、登录、认证等功能
 */

import { balanceTransactions, db, paymentRecords, users, userBalances } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

// ==================== 类型定义 ====================

// 用户类型
export type UserType = 'buyer' | 'seller';

// 用户信息
export interface User {
  id: string;
  user_no: string;
  phone: string;
  username: string;
  avatar?: string;
  user_type: UserType;
  wechat_openid?: string;
  wechat_unionid?: string;
  isRealNameVerified: boolean; // 是否已实名认证
  realName?: string; // 真实姓名
  email?: string;
  created_at: Date;
  updated_at: Date;
}

// 登录结果
export interface LoginResult {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

// 注册参数
export interface RegisterParams {
  phone: string;
  code: string;
  username?: string;
  user_type?: UserType;
}

// 登录参数
export interface LoginParams {
  phone: string;
  code: string;
}

// 微信登录参数
export interface WechatLoginParams {
  openid: string;
  nickname?: string;
  avatar?: string;
  unionid?: string;
  source?: 'mp' | 'open';
}

// 微信登录参数
export interface WechatLoginParams {
  openid: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  unionid?: string;
  source?: 'mp' | 'open';
}

interface AuthTokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

const AUTH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getAuthTokenSecret(): string {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.PGDATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.WECHAT_PAY_API_V3_KEY ||
    'codex-dev-auth-secret'
  );
}

function toBase64Url(input: Buffer | string): string {
  const value = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padding), 'base64').toString('utf8');
}

function signAuthTokenSegment(segment: string): string {
  return toBase64Url(crypto.createHmac('sha256', getAuthTokenSecret()).update(segment).digest());
}

function parseAuthToken(token: string): AuthTokenPayload | null {
  try {
    const [payloadSegment, signature] = token.split('.');
    if (!payloadSegment || !signature) {
      return null;
    }

    const expectedSignature = signAuthTokenSegment(payloadSegment);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(payloadSegment)) as AuthTokenPayload;
    if (!payload.userId || !payload.exp || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to parse auth token:', error);
    return null;
  }
}

// ==================== 工具函数 ====================

/**
 * 从Token中获取用户ID（内部函数，用于服务器端）
 * 每次都从文件重新加载，确保使用最新数据（开发环境）
 */
export function getServerUserIdInternal(token: string): string | null {
  try {
    const payload = parseAuthToken(token);
    if (payload?.userId) {
      return payload.userId;
    }
    // 在开发环境中，每次都从文件重新加载，确保数据是最新的
    // 这样可以避免HMR导致的数据不一致问题
    const reloadedTokens = loadTokens();

    // 浏览器可能会去除Base64末尾的=，需要尝试补全
    let tokenData = reloadedTokens.get(token);
    let finalToken = token;

    // 如果找不到，尝试补全=
    if (!tokenData) {
      const paddedToken = token + '=';
      tokenData = reloadedTokens.get(paddedToken);
      if (tokenData) {
        finalToken = paddedToken;
      }
    }

    // 如果还是找不到，尝试补全==
    if (!tokenData) {
      const paddedToken = token + '==';
      tokenData = reloadedTokens.get(paddedToken);
      if (tokenData) {
        finalToken = paddedToken;
      }
    }


    if (tokenData && tokenData.userId) {
      // 更新内存中的Token数据
      mockTokens.set(finalToken, tokenData);
      return tokenData.userId;
    }
  } catch (error) {
    console.error('Failed to get user ID from token:', error);
  }
  return null;
}

/**
 * 持久化Token存储
 * 在开发环境中使用文件存储避免HMR导致数据丢失
 */
const TOKEN_STORAGE_FILE = '/tmp/auth_tokens.json';
const USER_STORAGE_FILE = '/tmp/auth_users.json';

export function loadTokens(): Map<string, { userId: string; user: User; timestamp: number }> {
  if (typeof window !== 'undefined') {
    return new Map(); // 客户端不使用文件存储
  }

  try {
    const fs = require('fs');
    if (fs.existsSync(TOKEN_STORAGE_FILE)) {
      const data = fs.readFileSync(TOKEN_STORAGE_FILE, 'utf-8');
      const json = JSON.parse(data);
      const map = new Map();
      for (const [key, value] of Object.entries(json)) {
        // 转换用户数据中的日期字符串为Date对象
        const tokenValue = value as any;
        if (tokenValue.user) {
          if (tokenValue.user.created_at && typeof tokenValue.user.created_at === 'string') {
            tokenValue.user.created_at = new Date(tokenValue.user.created_at);
          }
          if (tokenValue.user.updated_at && typeof tokenValue.user.updated_at === 'string') {
            tokenValue.user.updated_at = new Date(tokenValue.user.updated_at);
          }
          // 同步用户数据到数据库
          syncUserToDatabase(tokenValue.user).catch(err => console.error('同步用户数据失败:', err));
        }
        map.set(key, tokenValue);
      }
      return map;
    }
  } catch (error) {
    console.error('加载Token存储失败:', error);
  }
  return new Map();
}

function saveTokens(tokens: Map<string, { userId: string; user: User; timestamp: number }>) {
  if (typeof window !== 'undefined') {
    return; // 客户端不保存
  }

  try {
    const fs = require('fs');
    const json: Record<string, any> = {};
    tokens.forEach((value, key) => {
      json[key] = value;
    });
    fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('保存Token存储失败:', error);
  }
}

function loadUsers(): Map<string, User> {
  if (typeof window !== 'undefined') {
    return new Map(); // 客户端不使用文件存储
  }

  try {
    const fs = require('fs');
    if (fs.existsSync(USER_STORAGE_FILE)) {
      const data = fs.readFileSync(USER_STORAGE_FILE, 'utf-8');
      const json = JSON.parse(data);
      const map = new Map();
      for (const [key, value] of Object.entries(json)) {
        // 转换日期字符串为Date对象
        const tokenValue = value as any;
        if (tokenValue.created_at) {
          tokenValue.created_at = new Date(tokenValue.created_at);
        }
        if (tokenValue.updated_at) {
          tokenValue.updated_at = new Date(tokenValue.updated_at);
        }
        map.set(key, tokenValue);
      }
      return map;
    }
  } catch (error) {
    console.error('加载用户存储失败:', error);
  }
  return new Map();
}

function saveUsers(users: Map<string, User>) {
  if (typeof window !== 'undefined') {
    return; // 客户端不保存
  }

  try {
    const fs = require('fs');
    const json: Record<string, any> = {};
    users.forEach((value, key) => {
      json[key] = value;
    });
    fs.writeFileSync(USER_STORAGE_FILE, JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('保存用户存储失败:', error);
  }
}

// 使用持久化存储的Token Map
const mockTokens: Map<string, { userId: string; user: User; timestamp: number }> = loadTokens();

/**
 * 生成用户编号
 * @returns 用户编号
 */
export function generateUserNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `USR${timestamp}${random}`;
}

/**
 * 生成Token
 * @returns Token
 */
export function generateToken(userId?: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    userId: userId || crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + AUTH_TOKEN_TTL_SECONDS,
  };
  const payloadSegment = toBase64Url(JSON.stringify(payload));
  return `${payloadSegment}.${signAuthTokenSegment(payloadSegment)}`;
}

/**
 * 验证手机号
 * @param phone 手机号
 * @returns 是否有效
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证验证码
 * @param code 验证码
 * @returns 是否有效
 */
export function validateCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// ==================== 模拟数据库 ====================

// 模拟用户数据
const mockUsers: Map<string, User> = loadUsers();

// 模拟验证码
const mockVerificationCodes: Map<string, { code: string; timestamp: number; phone: string }> = new Map();

// 当前登录用户（模拟Session）
let currentUser: User | null = null;

// ==================== 验证码服务 ====================

/**
 * 发送验证码
 * @param phone 手机号
 * @returns 验证码
 */
export async function sendVerificationCode(phone: string): Promise<string> {
  if (!validatePhone(phone)) {
    throw new Error('手机号格式不正确');
  }

  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const timestamp = Date.now();

  // 保存验证码（5分钟有效期）
  const codeId = `${phone}_${timestamp}`;
  mockVerificationCodes.set(codeId, { code, timestamp, phone });

  // 清理过期验证码
  const expireTime = 5 * 60 * 1000; // 5分钟
  setTimeout(() => {
    mockVerificationCodes.delete(codeId);
  }, expireTime);

  // 调用短信服务发送验证码
  try {
    const { sendSms } = await import('@/lib/sms-service');
    await sendSms('aliyun', { phone, code });
    console.log(`发送验证码到 ${phone}: ${code}`);
  } catch (error) {
    console.error('发送短信失败:', error);
    // 即使短信发送失败，也返回验证码（用于测试）
  }

  return code;
}

/**
 * 验证验证码
 * @param phone 手机号
 * @param code 验证码
 * @returns 是否有效
 */
export function verifyCode(phone: string, code: string): boolean {
  const now = Date.now();
  const expireTime = 5 * 60 * 1000; // 5分钟

  for (const [codeId, data] of mockVerificationCodes.entries()) {
    if (data.phone === phone && data.code === code) {
      // 检查是否过期
      if (now - data.timestamp > expireTime) {
        mockVerificationCodes.delete(codeId);
        return false;
      }

      // 验证成功，删除验证码
      mockVerificationCodes.delete(codeId);
      return true;
    }
  }

  return false;
}

// ==================== 用户服务 ====================

/**
 * 根据手机号获取用户
 * @param phone 手机号
 * @returns 用户信息
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  // 先从内存中查找
  for (const user of mockUsers.values()) {
    if (user.phone === phone) {
      return user;
    }
  }

  // 从数据库中查找
  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (dbUsers.length > 0) {
      const dbUser = dbUsers[0];
      const user: User = {
        id: dbUser.id,
        user_no: dbUser.id.substring(0, 8), // 使用 ID 前缀作为 user_no
        phone: dbUser.phone,
        username: dbUser.nickname,
        avatar: dbUser.avatar || undefined,
        user_type: dbUser.userType as UserType,
        isRealNameVerified: dbUser.isVerified || false,
        realName: dbUser.realName || undefined,
        created_at: new Date(dbUser.createdAt!),
        updated_at: new Date(dbUser.updatedAt!)
      };

      // 添加到内存中
      mockUsers.set(user.id, user);
      return user;
    }
  } catch (error) {
    console.error('从数据库查找用户失败:', error);
  }

  return null;
}

/**
 * 根据用户ID获取用户
 * @param userId 用户ID
 * @returns 用户信息
 */
export async function getUserById(userId: string): Promise<User | null> {
  // 先从内存中查找
  let user = mockUsers.get(userId);

  // 如果内存中没有，尝试从文件重新加载
  if (!user) {
    const reloadedUsers = loadUsers();
    user = reloadedUsers.get(userId);
    if (user) {
      // 更新内存中的用户数据
      mockUsers.set(userId, user);
      return user;
    }
  }

  // 从数据库中查找
  try {
    const dbUsers = await db
      .select({
        id: users.id,
        phone: users.phone,
        nickname: users.nickname,
        avatar: users.avatar,
        wechatOpenid: users.wechatOpenid,
        wechatUnionid: users.wechatUnionid,
        userType: users.userType,
        isVerified: users.isVerified,
        realName: users.realName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (dbUsers.length > 0) {
      const dbUser = dbUsers[0];
      const newUser: User = {
        id: dbUser.id,
        user_no: dbUser.id.substring(0, 8), // 使用 ID 前缀作为 user_no
        phone: dbUser.phone,
        username: dbUser.nickname,
        avatar: dbUser.avatar || undefined,
        wechat_openid: dbUser.wechatOpenid || undefined,
        wechat_unionid: dbUser.wechatUnionid || undefined,
        user_type: dbUser.userType as UserType,
        isRealNameVerified: dbUser.isVerified || false,
        realName: dbUser.realName || undefined,
        created_at: new Date(dbUser.createdAt!),
        updated_at: new Date(dbUser.updatedAt!)
      };

      // 添加到内存中
      mockUsers.set(userId, newUser);
      return newUser;
    }
  } catch (error) {
    console.error('从数据库查找用户失败:', error);
  }

  return null;
}

/**
 * 同步用户数据到数据库
 * @param user 用户信息
 */
async function syncUserToDatabase(user: User): Promise<void> {
  try {
    // 检查用户是否已在数据库中（通过ID）
    const existingDbUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (existingDbUser.length > 0) {
      // 更新用户信息
      await db.execute(sql`
        update users
        set
          phone = coalesce(${user.phone || null}, phone),
          nickname = ${user.username},
          avatar = ${user.avatar || null},
          user_type = ${user.user_type},
          wechat_openid = ${user.wechat_openid || null},
          wechat_unionid = ${user.wechat_unionid || null},
          updated_at = ${new Date().toISOString()}
        where id = ${user.id}
      `);
    } else {
      if (user.wechat_unionid) {
        const existingUnionUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.wechatUnionid, user.wechat_unionid))
          .limit(1);

        if (existingUnionUser.length > 0) {
          await db.execute(sql`
            update users
            set
              phone = case
                when (${user.phone || ''} <> '' and phone like 'wechat_%') then ${user.phone}
                else phone
              end,
              nickname = ${user.username},
              avatar = ${user.avatar || null},
              user_type = ${user.user_type},
              wechat_openid = coalesce(${user.wechat_openid || null}, wechat_openid),
              wechat_unionid = ${user.wechat_unionid},
              updated_at = ${new Date().toISOString()}
            where wechat_unionid = ${user.wechat_unionid}
          `);
          console.log('微信用户数据已更新(按 unionid 收口):', user.wechat_unionid);
          return;
        }
      }

      // 检查是否已通过微信 openid 存在
      if (user.wechat_openid) {
          const existingWechatUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.wechatOpenid, user.wechat_openid))
            .limit(1);

        if (existingWechatUser.length > 0) {
          // 微信用户已存在，更新信息
          await db.execute(sql`
            update users
            set
              nickname = ${user.username},
              avatar = ${user.avatar || null},
              wechat_unionid = coalesce(${user.wechat_unionid || null}, wechat_unionid),
              updated_at = ${new Date().toISOString()}
            where wechat_openid = ${user.wechat_openid}
          `);
          console.log('微信用户数据已更新:', user.wechat_openid);
          return;
        }
      }

      // 检查手机号是否已在数据库中（仅当手机号非空时）
      if (user.phone && user.phone.trim() !== '') {
          const existingPhoneUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.phone, user.phone))
            .limit(1);

        if (existingPhoneUser.length > 0) {
          // 手机号已存在，更新现有用户的微信信息
          await db.execute(sql`
            update users
            set
              nickname = ${user.username},
              avatar = ${user.avatar || null},
              user_type = ${user.user_type},
              wechat_openid = ${user.wechat_openid || null},
              wechat_unionid = ${user.wechat_unionid || null},
              updated_at = ${new Date().toISOString()}
            where phone = ${user.phone}
          `);
          console.log('用户数据已更新（手机号已存在）:', user.phone);
          return;
        }
      }

      // 创建新用户 - 对于没有手机号的微信用户，生成临时唯一标识
      const tempPhone = user.phone && user.phone.trim() !== '' 
        ? user.phone 
        : `wechat_${user.id.substring(0, 8)}`;

      await db.execute(sql`
        insert into users (
          id,
          phone,
          nickname,
          avatar,
          user_type,
          is_verified,
          real_name,
          id_card,
          wechat_openid,
          wechat_unionid,
          created_at,
          updated_at
        ) values (
          ${user.id},
          ${tempPhone},
          ${user.username || '寰俊鐢ㄦ埛'},
          ${user.avatar || null},
          ${user.user_type || 'buyer'},
          ${user.isRealNameVerified || false},
          ${user.realName || null},
          ${user.realName || null},
          ${user.wechat_openid || null},
          ${user.wechat_unionid || null},
          ${user.created_at.toISOString()},
          ${user.updated_at.toISOString()}
        )
      `);
      return;

      await db.insert(users).values({
        id: user.id,
        phone: tempPhone,
        nickname: user.username || '微信用户',
        avatar: user.avatar,
        userType: user.user_type || 'buyer',
        isVerified: user.isRealNameVerified || false,
        realName: user.realName,
        idCard: user.realName, // 暂时用 realName 作为 idCard
        wechatOpenid: user.wechat_openid,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString()
      });
    }
  } catch (error) {
    console.error('同步用户数据到数据库失败:', error);
    // 不抛出错误，避免影响登录流程
  }
}

/**
 * 创建用户余额记录
 * @param userId 用户ID
 */
async function createUserBalance(userId: string): Promise<void> {
  try {
    // 检查用户余额是否已存在
    const existingBalance = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);

    if (existingBalance.length === 0) {
      // 创建用户余额记录
      await db.insert(userBalances).values({
        userId: userId,
        availableBalance: '0.00',
        frozenBalance: '0.00',
        totalWithdrawn: '0.00',
        totalEarned: '0.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('创建用户余额失败:', error);
    // 不抛出错误，避免影响注册流程
  }
}

async function migrateLegacyWalletData(oldUserId: string, newUserId: string): Promise<void> {
  if (!oldUserId || !newUserId || oldUserId === newUserId) {
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const oldBalanceList = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, oldUserId))
        .limit(1);
      const newBalanceList = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, newUserId))
        .limit(1);

      if (oldBalanceList.length > 0) {
        const oldBalance = oldBalanceList[0];

        if (newBalanceList.length === 0) {
          await tx
            .update(userBalances)
            .set({
              userId: newUserId,
              updatedAt: now,
            })
            .where(eq(userBalances.id, oldBalance.id));
        } else {
          const newBalance = newBalanceList[0];

          await tx
            .update(userBalances)
            .set({
              availableBalance: (
                Number(newBalance.availableBalance || 0) + Number(oldBalance.availableBalance || 0)
              ).toFixed(2),
              frozenBalance: (
                Number(newBalance.frozenBalance || 0) + Number(oldBalance.frozenBalance || 0)
              ).toFixed(2),
              totalWithdrawn: (
                Number(newBalance.totalWithdrawn || 0) + Number(oldBalance.totalWithdrawn || 0)
              ).toFixed(2),
              totalEarned: (
                Number(newBalance.totalEarned || 0) + Number(oldBalance.totalEarned || 0)
              ).toFixed(2),
              updatedAt: now,
            })
            .where(eq(userBalances.id, newBalance.id));

          await tx.delete(userBalances).where(eq(userBalances.id, oldBalance.id));
        }
      }

      await tx
        .update(paymentRecords)
        .set({
          userId: newUserId,
          updatedAt: now,
        })
        .where(eq(paymentRecords.userId, oldUserId));

      await tx
        .update(balanceTransactions)
        .set({
          userId: newUserId,
        })
        .where(eq(balanceTransactions.userId, oldUserId));
    });
  } catch (error) {
    console.error('迁移旧用户钱包数据失败:', oldUserId, newUserId, error);
  }
}

async function getCanonicalUserByPhone(phone: string): Promise<User | null> {
  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (dbUsers.length === 0) {
      return null;
    }

    const dbUser = dbUsers[0];
    return {
      id: dbUser.id,
      user_no: dbUser.id.substring(0, 8),
      phone: dbUser.phone,
      username: dbUser.nickname,
      avatar: dbUser.avatar || undefined,
      wechat_openid: dbUser.wechatOpenid || undefined,
      wechat_unionid: dbUser.wechatUnionid || undefined,
      user_type: dbUser.userType as UserType,
      isRealNameVerified: dbUser.isVerified || false,
      realName: dbUser.realName || undefined,
      created_at: new Date(dbUser.createdAt!),
      updated_at: new Date(dbUser.updatedAt!)
    };
  } catch (error) {
    console.error('获取数据库标准用户失败:', error);
    return null;
  }
}

async function getCanonicalUserByWechatOpenid(openid: string): Promise<User | null> {
  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.wechatOpenid, openid))
      .limit(1);

    if (dbUsers.length === 0) {
      return null;
    }

    const dbUser = dbUsers[0];
    return {
      id: dbUser.id,
      user_no: dbUser.id.substring(0, 8),
      phone: dbUser.phone,
      username: dbUser.nickname,
      avatar: dbUser.avatar || undefined,
      wechat_openid: dbUser.wechatOpenid || undefined,
      wechat_unionid: dbUser.wechatUnionid || undefined,
      user_type: dbUser.userType as UserType,
      isRealNameVerified: dbUser.isVerified || false,
      realName: dbUser.realName || undefined,
      created_at: new Date(dbUser.createdAt!),
      updated_at: new Date(dbUser.updatedAt!),
    };
  } catch (error) {
    console.error('获取微信用户真实记录失败:', error);
    return null;
  }
}

async function getCanonicalUserByWechatUnionid(unionid: string): Promise<User | null> {
  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.wechatUnionid, unionid))
      .limit(1);

    if (dbUsers.length === 0) {
      return null;
    }

    const dbUser = dbUsers[0];
    return {
      id: dbUser.id,
      user_no: dbUser.id.substring(0, 8),
      phone: dbUser.phone,
      username: dbUser.nickname,
      avatar: dbUser.avatar || undefined,
      wechat_openid: dbUser.wechatOpenid || undefined,
      wechat_unionid: dbUser.wechatUnionid || undefined,
      user_type: dbUser.userType as UserType,
      isRealNameVerified: dbUser.isVerified || false,
      realName: dbUser.realName || undefined,
      created_at: new Date(dbUser.createdAt!),
      updated_at: new Date(dbUser.updatedAt!),
    };
  } catch (error) {
    console.error('获取微信 unionid 真实用户失败:', error);
    return null;
  }
}

/**
 * 注册用户
 * @param params 注册参数
 * @returns 登录结果
 */
export async function registerUser(params: RegisterParams): Promise<LoginResult> {
  try {
    // 验证手机号
    if (!validatePhone(params.phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 验证验证码
    if (!verifyCode(params.phone, params.code)) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    // 检查用户是否已存在
    const existingUser = await getUserByPhone(params.phone);
    if (existingUser) {
      return {
        success: false,
        message: '该手机号已注册'
      };
    }

    // 创建用户
    const user: User = {
      id: crypto.randomUUID(),
      user_no: generateUserNo(),
      phone: params.phone,
      username: params.username || `用户${params.phone.substr(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.phone}`,
      user_type: params.user_type || 'buyer',
      isRealNameVerified: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    // 保存用户
    mockUsers.set(user.id, user);
    saveUsers(mockUsers);

    // 同步用户数据到数据库
    syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));

    // 创建用户余额记录
    createUserBalance(user.id).catch(err => console.error('创建用户余额失败:', err));

    // 生成Token
    saveUsers(mockUsers);
    await syncUserToDatabase(user);
    await createUserBalance(user.id);

    const token = generateToken(user.id);
    mockTokens.set(token, { userId: user.id, user, timestamp: Date.now() });
    saveTokens(mockTokens);

    // 设置当前用户
    currentUser = user;

    return {
      success: true,
      message: '注册成功',
      user,
      token
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '注册失败'
    };
  }
}

/**
 * 用户登录（自动注册）
 * @param params 登录参数
 * @returns 登录结果
 */
export async function loginUser(params: LoginParams): Promise<LoginResult> {
  try {
    // 验证手机号
    if (!validatePhone(params.phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 验证验证码
    if (!verifyCode(params.phone, params.code)) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    // 查找用户
    let user = await getUserByPhone(params.phone);
    if (!user) {
      // 用户不存在，自动注册
      user = {
        id: crypto.randomUUID(),
        user_no: generateUserNo(),
        phone: params.phone,
        username: `用户${params.phone.substr(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.phone}`,
        user_type: 'buyer',
        isRealNameVerified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      // 保存用户
      mockUsers.set(user.id, user);
      saveUsers(mockUsers);

      // 同步用户数据到数据库
      syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));

      // 创建用户余额记录
      createUserBalance(user.id).catch(err => console.error('创建用户余额失败:', err));
    }

    // 如果用户已存在，也同步一次数据（确保信息最新）
    if (user) {
      syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));

      // 确保用户有余额记录
      createUserBalance(user.id).catch(err => console.error('创建用户余额失败:', err));
    }

    // 以数据库中的手机号用户为准，避免返回临时内存用户导致登录态前后不一致
    saveUsers(mockUsers);
    await syncUserToDatabase(user);
    const canonicalUser = await getCanonicalUserByPhone(params.phone);
    if (canonicalUser) {
      user = canonicalUser;
      mockUsers.set(user.id, user);
      saveUsers(mockUsers);
    }
    await createUserBalance(user.id);

    const token = generateToken(user.id);
    mockTokens.set(token, { userId: user.id, user, timestamp: Date.now() });
    saveTokens(mockTokens);

    // 设置当前用户
    currentUser = user;

    return {
      success: true,
      message: user.user_no.startsWith('USR') && mockUsers.size > 2 ? '登录成功' : '登录成功',
      user,
      token
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
}

/**
 * 微信登录/注册
 * @param params 微信登录参数
 * @returns 登录结果
 */
export async function wechatLogin(params: WechatLoginParams): Promise<LoginResult> {
  try {
    // 查找是否存在该OpenID的用户
    let user: User | null = null;

    for (const u of mockUsers.values()) {
      if (u.wechat_openid === params.openid || (params.unionid && u.wechat_unionid === params.unionid)) {
        user = u;
        break;
      }
    }

    if (!user && params.unionid) {
      user = await getCanonicalUserByWechatUnionid(params.unionid);
    }

    if (!user) {
      user = await getCanonicalUserByWechatOpenid(params.openid);
    }

    if (!user) {
      // 创建新用户
      user = {
        id: crypto.randomUUID(),
        user_no: generateUserNo(),
        phone: '',
        username: params.nickname || params.username || '微信用户',
        avatar: params.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=wechat',
        user_type: 'buyer',
        wechat_openid: params.openid,
        wechat_unionid: params.unionid,
        isRealNameVerified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsers.set(user.id, user);
      
      // 同步到数据库
      await syncUserToDatabase(user);
    } else {
      // 更新现有用户的昵称和头像
      if (params.nickname) {
        user.username = params.nickname;
      }
      if (params.avatar) {
        user.avatar = params.avatar;
      }
      if (params.unionid) {
        user.wechat_unionid = params.unionid;
      }
      if (!user.wechat_openid || params.source === 'mp' || user.wechat_openid === params.openid) {
        user.wechat_openid = params.openid;
      }
      user.updated_at = new Date();
      mockUsers.set(user.id, user);
      
      // 同步到数据库
      await syncUserToDatabase(user);
    }

    const canonicalUser = params.unionid
      ? await getCanonicalUserByWechatUnionid(params.unionid) || await getCanonicalUserByWechatOpenid(params.openid)
      : await getCanonicalUserByWechatOpenid(params.openid);
    if (canonicalUser) {
      user = canonicalUser;
      mockUsers.set(user.id, user);
      saveUsers(mockUsers);
    }

    // 生成Token
    const token = generateToken(user.id);
    mockTokens.set(token, { userId: user.id, user, timestamp: Date.now() });
    saveTokens(mockTokens);

    // 设置当前用户
    currentUser = user;

    return {
      success: true,
      message: user.wechat_openid ? '登录成功' : '注册成功',
      user,
      token
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
}

/**
 * 微信绑定手机号
 * @param phone 手机号
 * @param code 验证码
 * @param openid 微信OpenID
 * @param nickname 微信昵称
 * @param avatar 微信头像
 * @returns 登录结果
 */
export async function wechatBindPhone(
  phone: string,
  code: string,
  openid: string,
  nickname?: string,
  avatar?: string
): Promise<LoginResult> {
  try {
    // 验证验证码
    if (!verifyCode(phone, code)) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    // 查找是否已存在该手机号的用户
    let user = await getUserByPhone(phone);

    if (user) {
      // 用户已存在，绑定微信openid
      user.wechat_openid = openid;
      user.avatar = avatar || user.avatar;
      user.username = nickname || user.username;
      user.updated_at = new Date();

      // 更新mock数据
      mockUsers.set(user.id, user);

      // 同步到数据库
      syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));

      // 确保用户有余额记录
      createUserBalance(user.id).catch(err => console.error('创建用户余额失败:', err));
    } else {
      // 创建新用户并绑定微信
      user = {
        id: crypto.randomUUID(),
        user_no: generateUserNo(),
        phone: phone,
        username: nickname || `用户${phone.substring(-4)}`,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
        user_type: 'buyer',
        wechat_openid: openid,
        isRealNameVerified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsers.set(user.id, user);

      // 同步到数据库
      syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));

      // 创建用户余额记录
      createUserBalance(user.id).catch(err => console.error('创建用户余额失败:', err));
    }

    // 绑定手机号后同样收口到数据库中的真实用户，保持回调和鉴权一致
    const canonicalUser = await getCanonicalUserByPhone(phone);
    if (canonicalUser) {
      user = canonicalUser;
      mockUsers.set(user.id, user);
      saveUsers(mockUsers);
    }

    // 生成Token
    const token = generateToken(user.id);
    mockTokens.set(token, { userId: user.id, user, timestamp: Date.now() });
    saveTokens(mockTokens);

    // 设置当前用户
    currentUser = user;

    return {
      success: true,
      message: '绑定成功',
      user,
      token
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '绑定失败'
    };
  }
}


/**
 * 验证Token
 * @param token Token
 * @returns 用户信息
 */
export async function verifyToken(token: string): Promise<User | null> {
  const payload = parseAuthToken(token);
  if (payload?.userId) {
    try {
      return await getUserById(payload.userId);
    } catch (error) {
      console.error('Stateless token verification failed:', error);
      return null;
    }
  }

  const tokenData = mockTokens.get(token);

  if (!tokenData) {
    return null;
  }

  // 检查Token是否过期（24小时）
  const expireTime = 24 * 60 * 60 * 1000;
  if (Date.now() - tokenData.timestamp > expireTime) {
    mockTokens.delete(token);
    saveTokens(mockTokens);
    return null;
  }

  let user = tokenData.user;

  // 检查用户是否在数据库中存在
  try {
    const dbUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (dbUser.length === 0) {
      console.log('用户ID不在数据库中，尝试收口到真实用户:', user.id, user.phone, user.wechat_openid);

      let canonicalUser: User | null = null;

      if (user.wechat_unionid) {
        canonicalUser = await getCanonicalUserByWechatUnionid(user.wechat_unionid);
      }

      if (!canonicalUser && user.wechat_openid) {
        canonicalUser = await getCanonicalUserByWechatOpenid(user.wechat_openid);
      }

      if (!canonicalUser && user.phone) {
        canonicalUser = await getCanonicalUserByPhone(user.phone);
      }

      if (canonicalUser) {
        const legacyUserId = user.id;
        user = canonicalUser;

        await migrateLegacyWalletData(legacyUserId, user.id);

        mockTokens.set(token, {
          userId: user.id,
          user,
          timestamp: tokenData.timestamp,
        });
        mockUsers.set(user.id, user);
        saveTokens(mockTokens);
        saveUsers(mockUsers);

        console.log('已将 token 收口到数据库真实用户:', user.id, user.phone, user.wechat_openid);
      } else {
        console.log('数据库中不存在对应真实用户，尝试同步旧 token 用户:', user.phone, user.wechat_openid);
        syncUserToDatabase(user).catch(err => console.error('同步用户数据失败:', err));
      }
    }
  } catch (error) {
    console.error('验证Token时检查数据库失败:', error);
  }

  return user;
}

/**
 * 退出登录
 * @param token Token
 * @returns 是否成功
 */
export function logoutUser(token: string): boolean {
  mockTokens.delete(token);
  saveTokens(mockTokens);
  currentUser = null;
  return true;
}

/**
 * 获取当前登录用户
 * @returns 当前用户
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * 设置当前登录用户
 * @param user 用户信息
 */
export function setCurrentUser(user: User | null): void {
  currentUser = user;
}

/**
 * 获取所有用户（管理员）
 * @returns 用户列表
 */
export function getAllUsers(): User[] {
  return Array.from(mockUsers.values()).sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  );
}
