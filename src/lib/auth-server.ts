/**
 * 认证服务（服务器端）
 * 处理Token生成、验证和用户管理
 */

import { db, users } from './db';
import { eq } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  userType: 'buyer' | 'seller' | 'admin';
  email?: string;
  phone?: string;
  realName?: string;
  idCard?: string;
  verified?: boolean;
  verifiedAt?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPayload {
  userId: string;
  userType: string;
  username: string;
  exp?: number;
}

// ==================== Token 管理 ====================

/**
 * 生成认证Token
 */
export function generateToken(userId: string, userType: string = 'buyer'): string {
  const payload: TokenPayload = {
    userId,
    userType,
    username: '',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7天过期
  };

  // 简单的Base64编码（生产环境应使用JWT）
  const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `Bearer ${tokenData}`;
}

/**
 * 解析Token
 */
export function parseToken(token: string): TokenPayload | null {
  try {
    // 移除Bearer前缀
    const tokenData = token.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(tokenData, 'base64').toString());

    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * 验证Token
 */
export function verifyToken(token: string): TokenPayload | null {
  return parseToken(token);
}

// ==================== 用户管理 ====================

/**
 * 根据ID获取用户
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      ...user,
      username: user.nickname,
      userType: (user.userType as any) || 'buyer',
    } as User;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

/**
 * 根据用户名获取用户
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.nickname, username))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      ...user,
      username: user.nickname,
      userType: (user.userType as any) || 'buyer',
    } as User;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

/**
 * 根据手机号获取用户
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      ...user,
      username: user.nickname,
      userType: (user.userType as any) || 'buyer',
    } as User;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

/**
 * 创建用户
 */
export async function createUser(params: {
  username: string;
  nickname: string;
  avatar?: string;
  userType?: 'buyer' | 'seller' | 'admin';
  phone?: string;
  email?: string;
  realName?: string;
  idCard?: string;
  verified?: boolean;
  wechatOpenid?: string;
  wechatUnionid?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
}): Promise<User | null> {
  try {
    console.log('[创建用户] 参数:', params);

    // 如果没有提供 phone，生成一个唯一的 phone（微信用户使用）
    // 确保不超过 20 个字符，且唯一
    let phone = params.phone;
    if (!phone && params.wechatOpenid) {
      // 使用 openid 的前 10 位 + 时间戳的后 6 位
      const openidPrefix = params.wechatOpenid.substring(0, 10);
      const timestampSuffix = Date.now().toString().substring(7);
      phone = `mp_${openidPrefix}${timestampSuffix}`;
    } else if (!phone) {
      // 如果没有 openid，使用时间戳 + 随机数（截断到 20 字符）
      phone = `mp_${Date.now().toString().substring(7)}${Math.random().toString(36).substring(2, 8)}`;
    }

    const [user] = await db.insert(users).values({
      nickname: params.nickname || params.username || '用户',
      avatar: params.avatar,
      phone: phone,
      email: params.email,
      realName: params.realName,
      idCard: params.idCard,
      isVerified: params.verified || false,
      userType: params.userType || 'buyer',
      // 微信相关字段
      wechatOpenid: params.wechatOpenid,
      wechatUnionid: params.wechatUnionid,
      wechatNickname: params.wechatNickname,
      wechatAvatar: params.wechatAvatar,
    }).returning();

    console.log('[创建用户] 成功，用户ID:', user.id);

    return {
      ...user,
      username: user.nickname || phone,
      userType: (user.userType as any) || 'buyer',
    } as User;
  } catch (error) {
    console.error('[创建用户] 失败:', error);
    return null;
  }
}

/**
 * 更新用户
 */
export async function updateUser(userId: string, params: Partial<User>): Promise<boolean> {
  try {
    const updateData: any = { ...params, updatedAt: new Date().toISOString() };

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('更新用户失败:', error);
    return false;
  }
}

/**
 * 查找或创建微信用户
 */
export async function findOrCreateWechatUser(params: {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar: string;
}): Promise<User | null> {
  try {
    console.log('[查找或创建微信用户] openid:', params.openid);

    // 先查找用户（通过 wechatOpenid）
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.wechatOpenid, params.openid))
      .limit(1);

    console.log('[查找或创建微信用户] 已存在用户数量:', existingUsers.length);

    if (existingUsers.length > 0) {
      // 用户已存在，更新信息
      console.log('[查找或创建微信用户] 用户已存在，更新信息');
      await updateUserInfo(existingUsers[0].id, {
        nickname: params.nickname,
        avatar: params.avatar,
        wechatNickname: params.nickname,
        wechatAvatar: params.avatar,
      });
      return {
        ...existingUsers[0],
        username: existingUsers[0].nickname || existingUsers[0].phone,
        userType: (existingUsers[0].userType as any) || 'buyer',
      } as User;
    }

    // 创建新用户
    console.log('[查找或创建微信用户] 创建新用户');
    const newUser = await createUser({
      username: `wx_${params.openid.substring(0, 10)}`,
      nickname: params.nickname,
      avatar: params.avatar,
      userType: 'buyer',
      wechatOpenid: params.openid,
      wechatUnionid: params.unionid,
      wechatNickname: params.nickname,
      wechatAvatar: params.avatar,
    });

    if (!newUser) {
      console.error('[查找或创建微信用户] 创建用户失败');
    } else {
      console.log('[查找或创建微信用户] 创建用户成功，用户ID:', newUser.id);
    }

    return newUser;
  } catch (error) {
    console.error('[查找或创建微信用户] 失败:', error);
    return null;
  }
}

/**
 * 更新用户信息
 */
export async function updateUserInfo(userId: string, params: Partial<User>): Promise<boolean> {
  return updateUser(userId, params);
}
