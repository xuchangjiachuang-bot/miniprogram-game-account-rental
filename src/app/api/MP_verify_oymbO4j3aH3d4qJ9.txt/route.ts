import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 微信域名验证文件
 * GET /api/MP_verify_oymbO4j3aH3d4qJ9.txt
 */
export async function GET(request: NextRequest) {
  const filePath = join(process.cwd(), 'public', 'MP_verify_oymbO4j3aH3d4qJ9.txt');

  try {
    const content = readFileSync(filePath, 'utf-8');

    return new NextResponse(content.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    // 如果文件不存在，直接返回验证码
    return new NextResponse('oymbO4j3aH3d4qJ9', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
