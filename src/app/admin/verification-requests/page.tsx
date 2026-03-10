'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Image, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationApplication {
  id: string;
  userId: string;
  realName: string;
  idCard: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  status: string;
  createdAt: string;
  userPhone?: string;
  userName?: string;
}

export default function VerificationRequestsPage() {
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 加载待审核列表
  const loadApplications = async () => {
    setLoading(true);
    try {
      console.log('[loadApplications] 开始加载待审核列表');
      const response = await fetch(`/api/admin/verification-requests?page=${page}&pageSize=20`, {
        credentials: 'include' // 确保包含Cookie
      });
      const result = await response.json();

      console.log('[loadApplications] 响应结果:', result);

      if (result.success) {
        setApplications(result.data || []);
        setTotal(result.total || 0);
        console.log('[loadApplications] 加载成功，数据数量:', result.data?.length);
      } else {
        console.error('[loadApplications] 加载失败:', result.error);
        toast.error(result.error || '加载失败');
      }
    } catch (error) {
      console.error('[loadApplications] 加载待审核列表失败:', error);
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 审核申请
  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedApplication) return;

    if (status === 'rejected' && !reviewComment.trim()) {
      toast.error('请填写审核意见');
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
          reviewComment
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || '审核成功');
        setSelectedApplication(null);
        setReviewComment('');
        loadApplications();
      } else {
        toast.error(result.error || '审核失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      toast.error('审核失败，请重试');
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [page]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            实名认证审核
          </h1>
          <p className="text-muted-foreground mt-1">
            审核用户的实名认证申请
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>待审核列表</CardTitle>
            <CardDescription>
              共 {total} 条待审核申请
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无待审核申请</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setSelectedApplication(app)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{app.realName}</span>
                          <Badge variant="outline">{app.userPhone}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          身份证号：{app.idCard}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          提交时间：{new Date(app.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        审核
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 审核对话框 */}
        <Dialog open={!!selectedApplication} onOpenChange={(open) => {
          if (!open) {
            setSelectedApplication(null);
            setReviewComment('');
          }
        }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>审核实名认证</DialogTitle>
              <DialogDescription>
                请仔细核对用户提交的身份证信息
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>用户名</Label>
                    <div className="mt-1 p-2 bg-muted rounded">{selectedApplication.userName || '-'}</div>
                  </div>
                  <div>
                    <Label>手机号</Label>
                    <div className="mt-1 p-2 bg-muted rounded">{selectedApplication.userPhone}</div>
                  </div>
                  <div>
                    <Label>真实姓名</Label>
                    <div className="mt-1 p-2 bg-muted rounded">{selectedApplication.realName}</div>
                  </div>
                  <div>
                    <Label>身份证号</Label>
                    <div className="mt-1 p-2 bg-muted rounded">{selectedApplication.idCard}</div>
                  </div>
                </div>

                {/* 身份证照片 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>身份证正面</Label>
                    <div className="mt-1 border rounded-lg overflow-hidden bg-white">
                      {selectedApplication.idCardFrontUrl ? (
                        <img
                          src={selectedApplication.idCardFrontUrl}
                          alt="身份证正面"
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.svg';
                            e.currentTarget.alt = '图片加载失败';
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-gray-400">
                          暂无照片
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>身份证反面</Label>
                    <div className="mt-1 border rounded-lg overflow-hidden bg-white">
                      {selectedApplication.idCardBackUrl ? (
                        <img
                          src={selectedApplication.idCardBackUrl}
                          alt="身份证反面"
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.svg';
                            e.currentTarget.alt = '图片加载失败';
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-gray-400">
                          暂无照片
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 审核意见 */}
                <div>
                  <Label>审核意见</Label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="请输入审核意见（拒绝时必填）"
                    className="mt-1"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedApplication(null);
                      setReviewComment('');
                    }}
                    disabled={reviewing}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview('rejected')}
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        拒绝
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleReview('approved')}
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        通过
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
