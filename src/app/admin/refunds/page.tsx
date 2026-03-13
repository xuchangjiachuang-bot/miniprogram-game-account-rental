'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminRefundsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-orange-600" />
              <div>
                <CardTitle>售后审核页面已切换到真实订单链路</CardTitle>
                <CardDescription>
                  旧版售后接口基于内存 mock，已经下线，不再作为生产数据来源。
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700">
            <p>
              现在请通过订单管理和真实支付/退款链路处理问题订单，避免再使用旧的 mock 售后数据。
            </p>
            <div className="rounded-lg border border-orange-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                当前推荐处理方式
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>待支付、已支付、进行中的订单：到订单管理查看真实状态。</li>
                <li>微信退款：走订单支付链路和微信退款回调，不再走旧售后 API。</li>
                <li>争议与验收：以订单详情、验收结果和资金流水为准。</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/orders">
                <Button>
                  前往订单管理
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline">前往配置中心</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
