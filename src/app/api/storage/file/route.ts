import { NextRequest, NextResponse } from 'next/server';
import { inferContentType, readFile } from '@/lib/storage-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fileKey = request.nextUrl.searchParams.get('key')?.trim();

  if (!fileKey) {
    return NextResponse.json({ success: false, error: '文件标识不能为空' }, { status: 400 });
  }

  const fileBuffer = await readFile(fileKey);
  if (!fileBuffer) {
    return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': inferContentType(fileKey),
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
