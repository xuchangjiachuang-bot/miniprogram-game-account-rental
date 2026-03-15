'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CheckResult = {
  success?: boolean;
  message?: string;
  timestamp: string;
};

type DashboardData = {
  stats: {
    pendingAccounts: number;
    todayOrders: number;
    totalUsers: number;
    platformIncome: number;
  };
  recentActivities: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
    href: string;
  }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<CheckResult | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '加载仪表盘数据失败');
      }

      setDashboard(result.data);
    } catch (loadError) {
      console.error('[Admin Dashboard] 加载失败:', loadError);
      setError(loadError instanceof Error ? loadError.message : '加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        title: '待审核账号',
        value: dashboard.stats.pendingAccounts.toString(),
        helper: '当前待处理上架申请',
        icon: ShieldCheck,
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50',
      },
      {
        title: '今日订单',
        value: dashboard.stats.todayOrders.toString(),
        helper: '今日新创建订单数',
        icon: ShoppingCart,
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50',
      },
      {
        title: '用户总数',
        value: dashboard.stats.totalUsers.toString(),
        helper: '未删除用户总量',
        icon: Users,
        colorClass: 'text-sky-600',
        bgClass: 'bg-sky-50',
      },
      {
        title: '平台分账收入',
        value: `¥${dashboard.stats.platformIncome.toFixed(2)}`,
        helper: '已成功分账的平台收入',
        icon: TrendingUp,
        colorClass: 'text-orange-600',
        bgClass: 'bg-orange-50',
      },
    ];
  }, [dashboard]);

  const quickActions = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        title: '账号审核',
        description: '处理卖家提交的上架申请',
        summary: `${dashboard.stats.pendingAccounts} 个待审核`,
        href: '/admin/accounts',
        colorClass: 'text-amber-600',
      },
      {
        title: '订单管理',
        description: '查看真实订单与当前状态',
        summary: `${dashboard.stats.todayOrders} 个今日订单`,
        href: '/admin/orders',
        colorClass: 'text-emerald-600',
      },
      {
        title: '用户管理',
        description: '查看真实用户与钱包情况',
        summary: `${dashboard.stats.totalUsers} 位用户`,
        href: '/admin/users',
        colorClass: 'text-sky-600',
      },
    ];
  }, [dashboard]);

  const handleCheckExpiredOrders = async () => {
    setChecking(true);

    try {
      const response = await fetch('/api/orders/check-expired');
      const result = await response.json();

      setLastCheckResult({
        success: result.success,
        message: result.message || '检查完成',
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    } catch (checkError) {
      console.error('检查到期订单失败:', checkError);
      setLastCheckResult({
        success: false,
        message: '检查失败，请稍后重试',
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="mt-1 text-sm text-gray-600">显示当前真实业务数据，不再展示演示统计。</p>
        </div>
        <Button variant="outline" onClick={loadDashboard} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新数据
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={loadDashboard}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !dashboard ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className={`rounded-lg p-2 ${stat.bgClass}`}>
                      <Icon className={`h-4 w-4 ${stat.colorClass}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="mt-1 text-xs text-gray-500">{stat.helper}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="block">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-sm font-medium ${action.colorClass}`}>
                      {action.summary}
                      {' ->'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                  到期订单检查
                </CardTitle>
                <p className="text-sm text-gray-600">手动触发一次到期订单扫描。</p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleCheckExpiredOrders}
                  disabled={checking}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                >
                  {checking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      检查中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      立即检查
                    </>
                  )}
                </Button>

                {lastCheckResult ? (
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="text-gray-500">上次检查：{lastCheckResult.timestamp}</div>
                    <div className={lastCheckResult.success ? 'text-green-600' : 'text-red-600'}>
                      {lastCheckResult.message}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近动态</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.recentActivities.length === 0 ? (
                <div className="py-6 text-sm text-gray-500">暂无近期业务数据。</div>
              ) : (
                <div className="space-y-4">
                  {dashboard.recentActivities.map((activity) => (
                    <Link
                      key={activity.id}
                      href={activity.href}
                      className="flex items-center justify-between border-b py-2 transition-colors last:border-0 hover:text-gray-900"
                    >
                      <div>
                        <div className="text-sm font-medium">{activity.title}</div>
                        <div className="text-xs text-gray-600">{activity.description}</div>
                      </div>
                      <div className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
