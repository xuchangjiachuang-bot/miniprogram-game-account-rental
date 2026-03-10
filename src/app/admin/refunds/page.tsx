'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { RefundType, getRefundTypeText } from '@/lib/split-service';

interface RefundRequest {
  id: string;
  request_no: string;
  order_id: string;
  user_id: string;
  user_type: 'buyer' | 'seller';
  request_type: RefundType;
  refund_amount: number;
  refund_ratio?: number;
  reason: string;
  evidence_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_id?: string;
  admin_remark?: string;
  actual_refund_amount: number;
  actual_penalize_amount: number;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminRefundsPage() {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [adminRemark, setAdminRemark] = useState('');

  // 加载售后申请列表
  useEffect(() => {
    loadRefundRequests();
  }, [statusFilter]);

  const loadRefundRequests = async () => {
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const response = await fetch(`/api/refunds?admin=true&status=${status || ''}`);
      const data = await response.json();
      if (data.success) {
        setRefundRequests(data.data);
      }
    } catch (error) {
      console.error('加载售后申请失败:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRefund) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/refunds/${selectedRefund.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          admin_id: 'ADMIN001',
          admin_remark: adminRemark
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setSelectedRefund(null);
        setAdminRemark('');
        loadRefundRequests();
      } else {
        alert(data.message || '批准失败');
      }
    } catch (error) {
      console.error('批准失败:', error);
      alert('批准失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;

    const remark = adminRemark || prompt('请输入拒绝原因：');
    if (!remark) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/refunds/${selectedRefund.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          admin_id: 'ADMIN001',
          admin_remark: remark
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setSelectedRefund(null);
        setAdminRemark('');
        loadRefundRequests();
      } else {
        alert(data.message || '拒绝失败');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
      alert('拒绝失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: '待审核', variant: 'secondary' as const, className: '', icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { text: '已批准', variant: 'default' as const, className: 'bg-green-500', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { text: '已拒绝', variant: 'destructive' as const, className: '', icon: <XCircle className="h-3 w-3 mr-1" /> },
      cancelled: { text: '已取消', variant: 'secondary' as const, className: '', icon: <XCircle className="h-3 w-3 mr-1" /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config?.variant} className={config?.className || ''}>
        {config?.icon}
        {config?.text}
      </Badge>
    );
  };

  const getRefundTypeBadge = (type: RefundType) => {
    const typeConfig = {
      [RefundType.FULL]: { text: '全额退款', className: 'bg-red-500' },
      [RefundType.PARTIAL]: { text: '部分退款', className: 'bg-orange-500' },
      [RefundType.DEPOSIT_ONLY]: { text: '仅退押金', className: 'bg-cyan-500' },
      [RefundType.PENALTY]: { text: '违规扣款', className: 'bg-purple-500' }
    };

    const config = typeConfig[type];
    return (
      <Badge className={config?.className}>
        {config?.text}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">售后审核管理</h1>
            <p className="text-gray-600 mt-1">审核和处理用户的售后申请</p>
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已批准</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">待审核</p>
                  <p className="text-2xl font-bold mt-1">
                    {refundRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">已批准</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {refundRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">已拒绝</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    {refundRequests.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总申请数</p>
                  <p className="text-2xl font-bold mt-1">
                    {refundRequests.length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 售后申请列表 */}
        <Card>
          <CardHeader>
            <CardTitle>售后申请列表</CardTitle>
          </CardHeader>
          <CardContent>
            {refundRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无售后申请
              </div>
            ) : (
              <div className="space-y-4">
                {refundRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedRefund?.id === request.id ? 'border-purple-500 bg-purple-50' : ''
                    }`}
                    onClick={() => setSelectedRefund(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold">{request.request_no}</h3>
                          {getStatusBadge(request.status)}
                          {getRefundTypeBadge(request.request_type)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">申请用户</p>
                            <p className="font-semibold">{request.user_id}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">用户类型</p>
                            <p className="font-semibold">
                              {request.user_type === 'buyer' ? '买家' : '卖家'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">申请退款金额</p>
                            <p className="font-semibold text-red-600">
                              ¥{request.refund_amount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">申请时间</p>
                            <p className="font-semibold">
                              {new Date(request.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">申请原因：</p>
                          <p className="text-sm">{request.reason}</p>
                        </div>

                        {request.admin_remark && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">审核备注：</p>
                            <p className="text-sm">{request.admin_remark}</p>
                          </div>
                        )}

                        {request.actual_refund_amount > 0 && (
                          <div className="mt-3 text-sm">
                            <span className="text-gray-600">实际退款：</span>
                            <span className="font-semibold text-green-600">
                              ¥{request.actual_refund_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 审核面板 */}
        {selectedRefund && selectedRefund.status === 'pending' && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle>审核售后申请</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>申请单号</Label>
                <p className="font-semibold mt-1">{selectedRefund.request_no}</p>
              </div>

              <div>
                <Label>申请原因</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedRefund.reason}</p>
              </div>

              <div>
                <Label>申请退款金额</Label>
                <p className="font-semibold text-red-600 mt-1">
                  ¥{selectedRefund.refund_amount.toFixed(2)}
                </p>
              </div>

              {selectedRefund.refund_ratio && (
                <div>
                  <Label>退款比例</Label>
                  <p className="font-semibold mt-1">{selectedRefund.refund_ratio}%</p>
                </div>
              )}

              <div>
                <Label>审核备注</Label>
                <Input
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="请输入审核备注（可选）"
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  批准申请
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  拒绝申请
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRefund(null);
                  setAdminRemark('');
                }}
                className="w-full"
              >
                取消
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
