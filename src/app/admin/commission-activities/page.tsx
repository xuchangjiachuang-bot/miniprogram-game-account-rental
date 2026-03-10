'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Loader2, Calendar, Percent } from 'lucide-react';
import { toast } from 'sonner';

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
    enabled: false
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/commission-activities');
      const result = await res.json();
      if (result.success) {
        setActivities(result.data);
      }
    } catch (error) {
      toast.error('加载优惠活动失败');
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
        discountRate: activity.discountRate,
        startTime: activity.startTime.slice(0, 16),
        endTime: activity.endTime.slice(0, 16),
        enabled: activity.enabled
      });
    } else {
      setEditingActivity(null);
      setFormData({
        name: '',
        description: '',
        discountRate: 0,
        startTime: '',
        endTime: '',
        enabled: false
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
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString()
      };

      const url = editingActivity
        ? `/api/admin/commission-activities/${editingActivity.id}`
        : '/api/admin/commission-activities';

      const res = await fetch(url, {
        method: editingActivity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.success) {
        toast.success(editingActivity ? '活动已更新' : '活动已创建');
        setDialogOpen(false);
        loadActivities();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？')) return;

    try {
      const res = await fetch(`/api/admin/commission-activities/${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (result.success) {
        toast.success('活动已删除');
        loadActivities();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const isActive = (activity: CommissionActivity) => {
    const now = new Date();
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    return activity.enabled && now >= start && now <= end;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">抽佣优惠活动</h1>
          <p className="text-sm text-gray-600 mt-1">管理佣金优惠活动，活动期间上架的账号享受优惠</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          新建活动
        </Button>
      </div>

      <div className="grid gap-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无优惠活动，点击上方按钮创建
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
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded">
                        进行中
                      </span>
                    )}
                    {!activity.enabled && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded">
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
                            body: JSON.stringify({ ...activity, enabled: checked })
                          });
                          if (res.ok) {
                            loadActivities();
                            toast.success(checked ? '活动已启用' : '活动已禁用');
                          }
                        } catch (error) {
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
                {activity.description && (
                  <CardDescription>{activity.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">优惠比例：</span>
                    <span className="font-semibold text-green-600">{activity.discountRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">开始时间：</span>
                    <span>{formatDate(activity.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">结束时间：</span>
                    <span>{formatDate(activity.endTime)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    创建于：{formatDate(activity.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? '编辑优惠活动' : '新建优惠活动'}</DialogTitle>
            <DialogDescription>
              设置活动名称、优惠比例、活动时间等信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">活动名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="例如：新用户优惠活动"
              />
            </div>
            <div>
              <Label htmlFor="description">活动描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="描述活动详情"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="discountRate">优惠比例 (%) *</Label>
              <Input
                id="discountRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountRate}
                onChange={(e) => setFormData({...formData, discountRate: parseFloat(e.target.value) || 0})}
                placeholder="例如：5，表示佣金减免5%"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">开始时间 *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="endTime">结束时间 *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
              />
              <Label htmlFor="enabled">启用活动</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
