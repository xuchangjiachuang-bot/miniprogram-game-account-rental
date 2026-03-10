import { NextRequest, NextResponse } from 'next/server';
import { calculateSplit } from '@/lib/split-service';

// 模拟数据库操作
let splitRecords: any[] = [];

/**
 * 获取分账记录列表
 * GET /api/split-records
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderNo = searchParams.get('orderNo');
    const receiverId = searchParams.get('receiverId');
    const status = searchParams.get('status');
    
    let filteredRecords = splitRecords;
    
    if (orderId) {
      filteredRecords = filteredRecords.filter(r => r.order_id === orderId);
    }
    
    if (orderNo) {
      filteredRecords = filteredRecords.filter(r => r.order_no === orderNo);
    }
    
    if (receiverId) {
      filteredRecords = filteredRecords.filter(r => r.receiver_id === receiverId);
    }
    
    if (status) {
      filteredRecords = filteredRecords.filter(r => r.status === status);
    }
    
    return NextResponse.json({
      success: true,
      data: filteredRecords
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 创建分账记录（订单完成后调用）
 * POST /api/split-records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      order_id,
      order_no,
      seller_id,
      seller_name,
      rent_amount,
      commission_rate = 5
    } = body;
    
    // 验证必填字段
    if (!order_id || !order_no || !seller_id || !seller_name || !rent_amount) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }
    
    // 计算分账
    const split = calculateSplit(rent_amount, commission_rate);

    // 创建分账记录
    const records = [
      {
        receiver_type: 'seller',
        receiver_id: seller_id,
        receiver_name: seller_name,
        amount: split.seller_amount,
        split_type: 'platform_commission',
        description: '平台佣金'
      },
      {
        receiver_type: 'platform',
        receiver_id: 'platform',
        receiver_name: '平台',
        amount: split.platform_commission,
        split_type: 'seller_share',
        description: '卖家分成'
      }
    ];
    
    // 保存到数据库（模拟）
    records.forEach(record => {
      splitRecords.push({
        ...record,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    
    // TODO: 调用微信/支付宝分账接口
    // TODO: 更新分账记录状态
    // TODO: 更新用户余额
    
    return NextResponse.json({
      success: true,
      message: '分账记录已创建',
      data: {
        split,
        records: records.map(r => ({
          ...r,
          id: crypto.randomUUID()
        }))
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
