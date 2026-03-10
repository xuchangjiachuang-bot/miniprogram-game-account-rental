import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库操作
let withdrawals: any[] = [];

/**
 * 获取提现详情
 * GET /api/withdrawals/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const withdrawal = withdrawals.find(w => w.id === id);
    
    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        error: '提现记录不存在'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: withdrawal
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 更新提现状态（审核）
 * PUT /api/withdrawals/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { action, reviewer_id, review_remark } = body;
    
    // 查找提现记录
    const index = withdrawals.findIndex(w => w.id === id);
    
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: '提现记录不存在'
      }, { status: 404 });
    }
    
    const withdrawal = withdrawals[index];
    
    // 检查状态
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return NextResponse.json({
        success: false,
        error: '该提现记录无法审核'
      }, { status: 400 });
    }
    
    // 执行审核操作
    switch (action) {
      case 'approve':
        // 批准提现
        withdrawal.status = 'processing';
        withdrawal.reviewer_id = reviewer_id;
        withdrawal.review_time = new Date().toISOString();
        withdrawal.updated_at = new Date().toISOString();
        
        // TODO: 调用支付平台转账接口
        // TODO: 更新状态为 success/failed
        
        // 模拟成功
        withdrawal.status = 'success';
        withdrawal.third_party_transaction_id = `TXN${Date.now()}`;
        
        break;
        
      case 'reject':
        // 拒绝提现
        if (!review_remark) {
          return NextResponse.json({
            success: false,
            error: '拒绝提现必须提供备注'
          }, { status: 400 });
        }
        
        withdrawal.status = 'rejected';
        withdrawal.reviewer_id = reviewer_id;
        withdrawal.review_remark = review_remark;
        withdrawal.review_time = new Date().toISOString();
        withdrawal.updated_at = new Date().toISOString();
        
        // TODO: 退还用户余额
        // TODO: 创建余额变动记录
        
        break;
        
      case 'process':
        // 标记为处理中
        if (withdrawal.status !== 'pending') {
          return NextResponse.json({
            success: false,
            error: '只有待审核的申请才能标记为处理中'
          }, { status: 400 });
        }
        
        withdrawal.status = 'processing';
        withdrawal.reviewer_id = reviewer_id;
        withdrawal.updated_at = new Date().toISOString();
        
        break;
        
      case 'complete':
        // 标记为完成（手动转账后）
        if (withdrawal.status !== 'processing') {
          return NextResponse.json({
            success: false,
            error: '只有处理中的申请才能标记为完成'
          }, { status: 400 });
        }
        
        withdrawal.status = 'success';
        withdrawal.third_party_transaction_id = body.transaction_id || `MANUAL${Date.now()}`;
        withdrawal.updated_at = new Date().toISOString();
        
        break;
        
      case 'fail':
        // 标记为失败
        if (withdrawal.status !== 'processing') {
          return NextResponse.json({
            success: false,
            error: '只有处理中的申请才能标记为失败'
          }, { status: 400 });
        }
        
        withdrawal.status = 'failed';
        withdrawal.failure_reason = body.failure_reason || '转账失败';
        withdrawal.updated_at = new Date().toISOString();
        
        // TODO: 退还用户余额
        
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作'
        }, { status: 400 });
    }
    
    withdrawals[index] = withdrawal;
    
    return NextResponse.json({
      success: true,
      message: '操作成功',
      data: withdrawal
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 删除提现记录
 * DELETE /api/withdrawals/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const index = withdrawals.findIndex(w => w.id === id);
    
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: '提现记录不存在'
      }, { status: 404 });
    }
    
    // 只能删除待审核的记录
    if (withdrawals[index].status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: '只能删除待审核的提现记录'
      }, { status: 400 });
    }
    
    withdrawals.splice(index, 1);
    
    // TODO: 退还用户余额
    
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
