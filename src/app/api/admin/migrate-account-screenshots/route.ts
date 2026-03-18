import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { accounts, db } from '@/lib/db';
import { uploadFile } from '@/lib/storage-service';

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const [, contentType, base64] = match;
  const ext = contentType.split('/')[1] || 'bin';
  return {
    contentType,
    buffer: Buffer.from(base64, 'base64'),
    fileName: `migration.${ext}`,
  };
}

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:');
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json().catch(() => ({}));
    const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : '';
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
    const dryRun = body.dryRun !== false;

    const rows = accountId
      ? await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1)
      : await db.select().from(accounts).limit(limit);

    const candidateAccounts = rows.filter((account) => Array.isArray(account.screenshots) && account.screenshots.some(isDataUrl));

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          totalScanned: rows.length,
          candidateCount: candidateAccounts.length,
          candidates: candidateAccounts.map((account) => ({
            id: account.id,
            accountId: account.accountId,
            screenshotCount: Array.isArray(account.screenshots) ? account.screenshots.length : 0,
            dataUrlCount: Array.isArray(account.screenshots) ? account.screenshots.filter(isDataUrl).length : 0,
          })),
        },
      });
    }

    const migrated: Array<{ id: string; accountId: string; migratedCount: number }> = [];
    const failed: Array<{ id: string; accountId: string; error: string }> = [];

    for (const account of candidateAccounts) {
      try {
        const nextScreenshots: string[] = [];

        for (const screenshot of account.screenshots as unknown[]) {
          if (!isDataUrl(screenshot)) {
            if (typeof screenshot === 'string' && screenshot.trim()) {
              nextScreenshots.push(screenshot);
            }
            continue;
          }

          const parsed = parseDataUrl(screenshot);
          if (!parsed) {
            throw new Error('INVALID_DATA_URL');
          }

          const uploadResult = await uploadFile(parsed.buffer, parsed.fileName, parsed.contentType, {
            maxSize: 5 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            folder: 'screenshots',
            expireTime: 7 * 24 * 3600,
          });

          if (!uploadResult.success || !uploadResult.key) {
            throw new Error(uploadResult.error || 'UPLOAD_FAILED');
          }

          nextScreenshots.push(uploadResult.key);
        }

        await db
          .update(accounts)
          .set({
            screenshots: nextScreenshots,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(accounts.id, account.id));

        migrated.push({
          id: account.id,
          accountId: account.accountId,
          migratedCount: nextScreenshots.length,
        });
      } catch (error: any) {
        failed.push({
          id: account.id,
          accountId: account.accountId,
          error: error.message || 'MIGRATION_FAILED',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dryRun: false,
        totalScanned: rows.length,
        candidateCount: candidateAccounts.length,
        migrated,
        failed,
      },
    });
  } catch (error: any) {
    console.error('Failed to migrate account screenshots:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 },
    );
  }
}
