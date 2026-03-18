import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  cleanupRemoteStorageFile,
  debugRemoteStorageRoundTrip,
  deleteFile,
  readFile,
  uploadFile,
} from '@/lib/storage-service';

export const dynamic = 'force-dynamic';

const TEST_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
  'base64',
);

function isLocalTestRequest(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  return host.startsWith('127.0.0.1') || host.startsWith('localhost');
}

function hasValidSelfCheckToken(request: NextRequest) {
  const expectedToken = process.env.STORAGE_SELF_CHECK_TOKEN?.trim();
  if (!expectedToken) {
    return false;
  }

  const providedToken = request.headers.get('x-storage-self-check-token')?.trim();
  return providedToken === expectedToken;
}

function canUseSelfCheck(request: NextRequest) {
  return isLocalTestRequest(request)
    || process.env.ENABLE_INTERNAL_TEST_APIS === 'true'
    || hasValidSelfCheckToken(request);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function POST(request: NextRequest) {
  if (!canUseSelfCheck(request)) {
    return NextResponse.json({ success: false, error: 'SELF_CHECK_DISABLED' }, { status: 403 });
  }

  try {
    const body = await request.json().catch((): Record<string, unknown> => ({}));
    const mode = typeof body.mode === 'string' ? body.mode : 'upload';

    if (mode === 'cleanup') {
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!key) {
        return NextResponse.json({ success: false, error: 'MISSING_KEY' }, { status: 400 });
      }

      const remoteDelete = key.startsWith('cloud://')
        ? await cleanupRemoteStorageFile(key)
        : null;
      const deleted = remoteDelete?.ok ?? await deleteFile(key);
      return NextResponse.json({ success: deleted, deleted, key, remoteDelete });
    }

    if (mode === 'debug') {
      const debugResult = await debugRemoteStorageRoundTrip(
        TEST_IMAGE_BUFFER,
        `storage-self-check-${Date.now()}-${randomUUID()}.png`,
        'image/png',
        {
          maxSize: 1024 * 1024,
          allowedTypes: ['image/png'],
          folder: 'diagnostics',
          expireTime: 600,
        },
      );

      return NextResponse.json(debugResult, { status: debugResult.success ? 200 : 500 });
    }

    const fileName = `storage-self-check-${Date.now()}-${randomUUID()}.png`;
    const uploadResult = await uploadFile(TEST_IMAGE_BUFFER, fileName, 'image/png', {
      maxSize: 1024 * 1024,
      allowedTypes: ['image/png'],
      folder: 'diagnostics',
    });

    if (!uploadResult.success || !uploadResult.key) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'UPLOAD_FAILED' },
        { status: 500 },
      );
    }

    const readBackBuffer = await readFile(uploadResult.key);
    const readbackMatches = Boolean(
      readBackBuffer && Buffer.compare(readBackBuffer, TEST_IMAGE_BUFFER) === 0,
    );

    let deleted = false;
    if (body.cleanup === true) {
      deleted = await deleteFile(uploadResult.key);
    }

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      url: uploadResult.url,
      readbackMatches,
      deleted,
      bytes: TEST_IMAGE_BUFFER.length,
    });
  } catch (error: unknown) {
    console.error('[POST /api/test/storage-self-check] Error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'SELF_CHECK_FAILED' },
      { status: 500 },
    );
  }
}
