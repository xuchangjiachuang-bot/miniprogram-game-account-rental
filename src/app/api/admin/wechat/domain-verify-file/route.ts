import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

function buildVerifyUrl(filename: string) {
  return `https://hfb.yugioh.top/${filename}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const { filename, content } = body;

    if (!filename || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing filename or content' },
        { status: 400 }
      );
    }

    if (!filename.startsWith('MP_verify_') || !filename.endsWith('.txt')) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification filename format' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', filename);
    fs.writeFileSync(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Verification file uploaded successfully',
      data: {
        exists: true,
        filename,
        url: buildVerifyUrl(filename),
      },
    });
  } catch (error: any) {
    console.error('Failed to upload verification file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload verification file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    let filename = searchParams.get('filename');
    const publicDir = path.join(process.cwd(), 'public');

    if (!filename && fs.existsSync(publicDir)) {
      filename =
        fs
          .readdirSync(publicDir)
          .find((name) => name.startsWith('MP_verify_') && name.endsWith('.txt')) || null;
    }

    if (!filename) {
      return NextResponse.json({
        success: true,
        data: { exists: false },
      });
    }

    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        data: { filename, exists: false },
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({
      success: true,
      message: 'Verification file found',
      data: {
        exists: true,
        filename,
        url: buildVerifyUrl(filename),
        content: `${content.substring(0, 20)}...`,
      },
    });
  } catch (error: any) {
    console.error('Failed to check verification file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check verification file' },
      { status: 500 }
    );
  }
}
