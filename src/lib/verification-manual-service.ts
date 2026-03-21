/**
 * 实名认证服务（人工审核）
 */

import { and, desc, eq, ne } from 'drizzle-orm';
import { db, users, verificationApplications } from '@/lib/db';
import { classifyStoredFileReference } from '@/lib/storage-service';

function normalizeStoredFileValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const classified = classifyStoredFileReference(trimmed);
  return classified.kind === 'storage-key' ? classified.normalized : trimmed;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type VerificationService = 'manual' | 'aliyun' | 'tencent';

export interface VerificationApplication {
  id: string;
  userId: string;
  realName: string;
  phone: string;
  idCard: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  verificationService: VerificationService;
  verificationResult?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVerificationParams {
  userId: string;
  realName: string;
  phone: string;
  idCard: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  verificationService?: VerificationService;
}

export interface ReviewVerificationParams {
  applicationId: string;
  status: 'approved' | 'rejected';
  reviewComment?: string;
  reviewerId: string;
  reviewerName?: string;
}

export async function createVerificationApplication(
  params: CreateVerificationParams,
): Promise<{ success: boolean; data?: VerificationApplication; error?: string }> {
  try {
    const normalizedFrontUrl = normalizeStoredFileValue(params.idCardFrontUrl);
    const normalizedBackUrl = normalizeStoredFileValue(params.idCardBackUrl);

    const existingPhoneOwner = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, params.phone), ne(users.id, params.userId)))
      .limit(1);

    if (existingPhoneOwner.length > 0) {
      return {
        success: false,
        error: '该手机号已被其他账号使用',
      };
    }

    const existingPending = await db
      .select()
      .from(verificationApplications)
      .where(
        and(
          eq(verificationApplications.userId, params.userId),
          eq(verificationApplications.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingPending.length > 0) {
      return {
        success: false,
        error: '您已有待审核的实名认证申请，请勿重复提交',
      };
    }

    const approvedApplication = await db
      .select()
      .from(verificationApplications)
      .where(
        and(
          eq(verificationApplications.userId, params.userId),
          eq(verificationApplications.status, 'approved'),
        ),
      )
      .limit(1);

    if (approvedApplication.length > 0) {
      return {
        success: false,
        error: '您已完成实名认证，无需重复提交',
      };
    }

    const result = await db
      .insert(verificationApplications)
      .values({
        userId: params.userId,
        realName: params.realName,
        phone: params.phone,
        idCard: params.idCard,
        idCardFrontUrl: normalizedFrontUrl,
        idCardBackUrl: normalizedBackUrl,
        verificationService: params.verificationService || 'manual',
      })
      .returning();

    return {
      success: true,
      data: result[0] as VerificationApplication,
    };
  } catch (error: any) {
    console.error('创建实名认证申请失败:', error);
    return {
      success: false,
      error: error.message || '创建实名认证申请失败',
    };
  }
}

export async function getUserVerificationApplication(userId: string): Promise<VerificationApplication | null> {
  try {
    const result = await db
      .select()
      .from(verificationApplications)
      .where(eq(verificationApplications.userId, userId))
      .orderBy(desc(verificationApplications.createdAt))
      .limit(1);

    return (result[0] as VerificationApplication) || null;
  } catch (error) {
    console.error('获取用户实名认证申请失败:', error);
    return null;
  }
}

export async function getPendingVerificationApplications(
  page = 1,
  pageSize = 20,
): Promise<{ success: boolean; data?: VerificationApplication[]; total?: number; error?: string }> {
  try {
    const offset = (page - 1) * pageSize;

    const pendingFilter = and(
      eq(verificationApplications.status, 'pending'),
      eq(users.isVerified, false),
    );

    const totalCount = await db
      .select({ id: verificationApplications.id })
      .from(verificationApplications)
      .innerJoin(users, eq(users.id, verificationApplications.userId))
      .where(pendingFilter);

    const result = await db
      .select({ application: verificationApplications })
      .from(verificationApplications)
      .innerJoin(users, eq(users.id, verificationApplications.userId))
      .where(pendingFilter)
      .orderBy(desc(verificationApplications.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      data: result.map(({ application }) => application as VerificationApplication),
      total: totalCount.length,
    };
  } catch (error: any) {
    console.error('获取待审核实名认证申请失败:', error);
    return {
      success: false,
      error: error.message || '获取待审核实名认证申请失败',
    };
  }
}

export async function reviewVerificationApplication(
  params: ReviewVerificationParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { applicationId, status, reviewComment, reviewerId, reviewerName } = params;

    const result = await db
      .update(verificationApplications)
      .set({
        status,
        reviewedBy: reviewerName || reviewerId,
        reviewedAt: new Date().toISOString(),
        reviewComment,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(verificationApplications.id, applicationId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: '实名认证申请不存在',
      };
    }

    if (status === 'approved') {
      const application = result[0];
      await db
        .update(users)
        .set({
          isVerified: true,
          realName: application.realName,
          phone: application.phone,
          idCard: application.idCard,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, application.userId));
    }

    return { success: true };
  } catch (error: any) {
    console.error('审核实名认证申请失败:', error);
    return {
      success: false,
      error: error.message || '审核实名认证申请失败',
    };
  }
}

export async function getVerificationApplicationById(applicationId: string): Promise<VerificationApplication | null> {
  try {
    const result = await db
      .select()
      .from(verificationApplications)
      .where(eq(verificationApplications.id, applicationId))
      .limit(1);

    return (result[0] as VerificationApplication) || null;
  } catch (error) {
    console.error('获取实名认证申请详情失败:', error);
    return null;
  }
}
