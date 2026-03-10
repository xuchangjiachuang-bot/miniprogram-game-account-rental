'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Clock,
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

const stats = [
  {
    title: '待审核账号',
    value: '12',
    change: '+3 较昨日',
    icon: ShieldCheck,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
  },
  {
    title: '今日订单',
    value: '28',
    change: '+5 较昨日',
    icon: ShoppingCart,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
  },
  {
    title: '用户总数',
    value: '1,234',
    change: '+42 较昨日',
    icon: Users,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
  },
  {
    title: '平台收入',
    value: '¥3,280',
    change: '+¥480 较昨日',
    icon: TrendingUp,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50',
  },
];

const quickActions = [
  {
    title: '账号审核',
    description: '处理卖家提交的账号上架申请。',
    summary: '12 个待审核',
    href: '/admin/accounts',
    colorClass: 'text-purple-600',
  },
  {
    title: '订单管理',
    description: '管理租赁订单与结算进度。',
    summary: '28 个今日订单',
    href: '/admin/orders',
    colorClass: 'text-green-600',
  },
  {
    title: '用户管理',
    description: '查看和管理平台用户信息。',
    summary: '1,234 位用户',
    href: '/admin/users',
    colorClass: 'text-blue-600',
  },
];

const recentActivities = [
  { user: '用户A', action: '提交了账号上架申请', time: '10 分钟前' },
  { user: '用户B', action: '完成了订单支付', time: '15 分钟前' },
  { user: '用户C', action: '发起了提现申请', time: '30 分钟前' },
  { user: '用户D', action: '完成了账号租赁', time: '1 小时前' },
  { user: '用户E', action: '注册成为卖家', time: '2 小时前' },
];

export default function AdminDashboard() {
  const [checking, setChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<CheckResult | null>(null);

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
    } catch (error) {
      console.error('检查到期订单失败:', error);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="mt-1 text-sm text-gray-600">查看平台运营数据概览。</p>
      </div>

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
                <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
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
                  {action.summary} →
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

            {lastCheckResult && (
              <div className="mt-3 space-y-1 text-xs">
                <div className="text-gray-500">上次检查：{lastCheckResult.timestamp}</div>
                <div className={lastCheckResult.success ? 'text-green-600' : 'text-red-600'}>
                  {lastCheckResult.message}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={`${activity.user}-${activity.time}`}
                className="flex items-center justify-between border-b py-2 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{activity.user}</div>
                  <div className="text-xs text-gray-600">{activity.action}</div>
                </div>
                <div className="text-xs text-gray-500">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
