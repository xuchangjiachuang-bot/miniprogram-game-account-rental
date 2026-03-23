'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type VerificationStatus = 'pending' | 'approved' | 'rejected';
type VerificationStatusFilter = 'all' | VerificationStatus;

interface VerificationApplication {
  id: string;
  userId: string;
  realName: string;
  idCard: string;
  phone: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  status: VerificationStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  userPhone?: string;
  userName?: string;
  userVerified?: boolean;
}

const PAGE_SIZE = 20;

function getStatusBadge(status: VerificationStatus) {
  if (status === 'approved') {
    return <Badge className="bg-green-500">已通过</Badge>;
  }

  if (status === 'rejected') {
    return <Badge variant="destructive">已驳回</Badge>;
  }

  return <Badge variant="outline">待审核</Badge>;
}

export default function VerificationRequestsPage() {
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<VerificationStatusFilter>('pending');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/verification-requests?page=${page}&pageSize=${PAGE_SIZE}&status=${statusFilter}`,
        { credentials: 'include' },
      );
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '加载实名认证申请失败');
        return;
      }

      setApplications(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('加载实名认证申请失败:', error);
      toast.error('加载实名认证申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: VerificationStatus) => {
    if (!selectedApplication) {
      return;
    }

    if (status === 'rejected' && !reviewComment.trim()) {
      toast.error('驳回时请填写处理说明');
      return;
    }

    setReviewing(true);
    try {
      const response = await fetch('/api/admin/verification-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          status,
          reviewComment: reviewComment.trim(),
        }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || '处理失败');
        return;
      }

      toast.success(result.message || '处理成功');
      setSelectedApplication(null);
      setReviewComment('');
      await loadApplications();
    } catch (error) {
      console.error('审核实名认证失败:', error);
      toast.error('处理失败');
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, [page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6" />
            实名认证审核
          </h1>
          <p className="mt-1 text-muted-foreground">查看并处理全部实名认证申请，自动审核通过的记录也会保留在这里。</p>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>实名认证记录</CardTitle>
              <CardDescription>共 {total} 条记录</CardDescription>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(value: VerificationStatusFilter) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                  <SelectItem value="all">全部记录</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>暂无实名认证记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      setSelectedApplication(app);
                      setReviewComment(app.reviewComment || '');
                    }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{app.realName}</span>
                          {getStatusBadge(app.status)}
                          {app.userVerified ? <Badge variant="outline">用户当前已实名</Badge> : null}
                          {app.userPhone ? <Badge variant="outline">{app.userPhone}</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">身份证号：{app.idCard}</p>
                        <p className="text-sm text-muted-foreground">
                          提交时间：{new Date(app.createdAt).toLocaleString('zh-CN')}
                        </p>
                        {app.reviewedAt ? (
                          <p className="text-sm text-muted-foreground">
                            处理时间：{new Date(app.reviewedAt).toLocaleString('zh-CN')}
                          </p>
                        ) : null}
                      </div>
                      <Button variant="outline" size="sm">
                        {app.status === 'pending' ? '审核' : '查看'}
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
              <span>
                第 {page} / {totalPages} 页，共 {total} 条
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={!!selectedApplication}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedApplication(null);
              setReviewComment('');
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>实名认证详情</DialogTitle>
              <DialogDescription>自动审核通过的记录也可以在这里查看和人工纠正。</DialogDescription>
            </DialogHeader>

            {selectedApplication ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>用户昵称</Label>
                    <div className="mt-1 rounded bg-muted p-2">{selectedApplication.userName || '-'}</div>
                  </div>
                  <div>
                    <Label>手机号</Label>
                    <div className="mt-1 rounded bg-muted p-2">{selectedApplication.userPhone || '-'}</div>
                  </div>
                  <div>
                    <Label>真实姓名</Label>
                    <div className="mt-1 rounded bg-muted p-2">{selectedApplication.realName}</div>
                  </div>
                  <div>
                    <Label>身份证号</Label>
                    <div className="mt-1 rounded bg-muted p-2">{selectedApplication.idCard}</div>
                  </div>
                  <div>
                    <Label>当前状态</Label>
                    <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                  </div>
                  <div>
                    <Label>处理人</Label>
                    <div className="mt-1 rounded bg-muted p-2">{selectedApplication.reviewedBy || '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>身份证正面</Label>
                    <div className="mt-1 overflow-hidden rounded-lg border bg-white">
                      {selectedApplication.idCardFrontUrl ? (
                        <img
                          src={selectedApplication.idCardFrontUrl}
                          alt="身份证正面"
                          className="h-auto w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
                          暂无图片
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>身份证反面</Label>
                    <div className="mt-1 overflow-hidden rounded-lg border bg-white">
                      {selectedApplication.idCardBackUrl ? (
                        <img
                          src={selectedApplication.idCardBackUrl}
                          alt="身份证反面"
                          className="h-auto w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
                          暂无图片
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>处理说明</Label>
                  <Textarea
                    className="mt-1"
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="需要修改状态时，请填写处理说明"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="outline"
                    disabled={reviewing}
                    onClick={() => {
                      setSelectedApplication(null);
                      setReviewComment('');
                    }}
                  >
                    关闭
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={reviewing}
                    onClick={() => handleReview('rejected')}
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        驳回并撤销实名
                      </>
                    )}
                  </Button>
                  <Button disabled={reviewing} onClick={() => handleReview('approved')}>
                    {reviewing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        标记为通过
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
