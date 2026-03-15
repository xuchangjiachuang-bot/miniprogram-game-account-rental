'use client';

import { useEffect, useState } from 'react';
import { Calendar, Edit, Loader2, Percent, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CommissionActivity {
  id: string;
  name: string;
  description: string;
  discountRate: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CommissionActivitiesPage() {
  const [activities, setActivities] = useState<CommissionActivity[]>([]);
  const [baseCommissionRate, setBaseCommissionRate] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CommissionActivity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountRate: 0,
    startTime: '',
    endTime: '',
    enabled: false,
  });

  useEffect(() => {
    void Promise.all([loadActivities(), loadPlatformSettings()]);
  }, []);

  const loadPlatformSettings = async () => {
    try {
      const res = await fetch('/api/admin/platform-settings', { cache: 'no-store' });
      const result = await res.json();
      if (result.success) {
        setBaseCommissionRate(Number(result.data?.commissionRate) || 5);
      }
    } catch {
      // Keep fallback display value.
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/commission-activities', { cache: 'no-store' });
      const result = await res.json();
      if (result.success) {
        setActivities(
          (result.data || []).map((activity: CommissionActivity) => ({
            ...activity,
            discountRate: Number(activity.discountRate) || 0,
          }))
        );
      }
    } catch {
      toast.error('加载佣金活动失败');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (activity?: CommissionActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        name: activity.name,
        description: activity.description,
        discountRate: Number(activity.discountRate) || 0,
        startTime: activity.startTime.slice(0, 16),
        endTime: activity.endTime.slice(0, 16),
        enabled: activity.enabled,
      });
    } else {
      setEditingActivity(null);
      setFormData({
        name: '',
        description: '',
        discountRate: 0,
        startTime: '',
        endTime: '',
        enabled: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.name || !formData.startTime || !formData.endTime) {
        toast.error('请填写必填字段');
        return;
      }

      const data = {
        ...formData,
        discountRate: Math.max(0, Number(formData.discountRate) || 0),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };

      const url = editingActivity
        ? `/api/admin/commission-activities/${editingActivity.id}`
        : '/api/admin/commission-activities';

      const res = await fetch(url, {
        method: editingActivity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(editingActivity ? '活动已更新' : '活动已创建');
        setDialogOpen(false);
        await loadActivities();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/commission-activities/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        toast.success('活动已删除');
        await loadActivities();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('zh-CN');

  const isActive = (activity: CommissionActivity) => {
    const now = new Date();
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    return activity.enabled && now >= start && now <= end;
  };

  const effectiveRate = Math.max(0, baseCommissionRate - (Number(formData.discountRate) || 0));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">佣金优惠活动</h1>
          <p className="mt-1 text-sm text-gray-600">
            按“基础佣金 - 减免佣金点数”生效。比如基础佣金 10%，这里填 10%，活动期佣金就是 0%。
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          新建活动
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4 text-sm text-muted-foreground">
          当前基础佣金是 <span className="font-semibold text-foreground">{baseCommissionRate}%</span>。
          这里填写的是减免的佣金点数，不是折扣系数。
          例如：减免 5%，代表 10% 佣金降为 5%；减免 10%，代表 10% 佣金降为 0%。
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无佣金活动，点击上方按钮创建。
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className={isActive(activity) ? 'border-green-500 bg-green-50/50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>{activity.name}</CardTitle>
                    {isActive(activity) && (
                      <span className="rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                        进行中
                      </span>
                    )}
                    {!activity.enabled && (
                      <span className="rounded bg-gray-500 px-2 py-0.5 text-xs font-medium text-white">
                        已禁用
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={activity.enabled}
                      onCheckedChange={async (checked) => {
                        try {
                          const res = await fetch(`/api/admin/commission-activities/${activity.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...activity, enabled: checked }),
                          });
                          const result = await res.json();
                          if (result.success) {
                            await loadActivities();
                            toast.success(checked ? '活动已启用' : '活动已禁用');
                          } else {
                            toast.error(result.error || '操作失败');
                          }
                        } catch {
                          toast.error('操作失败');
                        }
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={() => openDialog(activity)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(activity.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {activity.description && <CardDescription>{activity.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">减免佣金点数：</span>
                    <span className="font-semibold text-green-600">{activity.discountRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">开始时间：</span>
                    <span>{formatDate(activity.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">结束时间：</span>
                    <span>{formatDate(activity.endTime)}</span>
                  </div>
                  <div className="text-muted-foreground">创建于：{formatDate(activity.createdAt)}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? '编辑佣金活动' : '新建佣金活动'}</DialogTitle>
            <DialogDescription>
              设置活动名称、减免佣金点数和生效时间。实际佣金 = 基础佣金 - 减免佣金点数，最低为 0%。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">活动名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：新用户免佣活动"
              />
            </div>
            <div>
              <Label htmlFor="description">活动描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述活动适用范围或说明"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="discountRate">减免佣金点数 (%) *</Label>
              <Input
                id="discountRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountRate}
                onChange={(e) => setFormData({ ...formData, discountRate: parseFloat(e.target.value) || 0 })}
                placeholder="例如：10，表示基础佣金 10% 时活动佣金降到 0%"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                当前基础佣金 {baseCommissionRate}% ，本活动实际佣金将为 {effectiveRate}%。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">开始时间 *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">结束时间 *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">启用活动</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
