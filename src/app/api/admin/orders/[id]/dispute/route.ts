import { NextRequest, NextResponse } from 'next/server';
import { getOrderDispute, resolveOrderDispute } from '@/lib/dispute-service';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const dispute = await getOrderDispute(id);

    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (error: any) {
    console.error('[Admin Dispute] 获取纠纷失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取纠纷失败' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const body = await request.json();
    const decision = typeof body.decision === 'string' ? body.decision : '';
    const remark = typeof body.remark === 'string' ? body.remark : '';

    if (!decision) {
      return NextResponse.json({ success: false, error: '缺少处理动作' }, { status: 400 });
    }

    const result = await resolveOrderDispute({
      orderId: id,
      decision: decision as 'refund_buyer_full' | 'resume_order' | 'complete_order',
      remark,
      adminName: auth.admin.username || auth.admin.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Admin Dispute] 处理纠纷失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '处理纠纷失败' },
      { status: 500 },
    );
  }
}
