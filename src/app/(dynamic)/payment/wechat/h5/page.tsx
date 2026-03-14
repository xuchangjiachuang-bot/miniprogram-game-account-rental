import Link from 'next/link';
import { AlertTriangle, QrCode, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WechatH5PaymentPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>当前浏览器暂不支持微信支付</CardTitle>
          <CardDescription>
            H5 支付资质暂未通过，外部手机浏览器链路已先隔离，避免继续报错。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>推荐方式一</AlertTitle>
            <AlertDescription>请在微信内打开当前页面，系统会自动走 JSAPI 支付链路。</AlertDescription>
          </Alert>

          <Alert>
            <QrCode className="h-4 w-4" />
            <AlertTitle>推荐方式二</AlertTitle>
            <AlertDescription>请在电脑浏览器打开订单或充值页面，系统会自动走 Native 扫码支付。</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>当前状态</AlertTitle>
            <AlertDescription>
              这里不再继续创建 H5 支付订单，避免产生无效单和误导测试结果。
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full">
            <Link href="/login">返回登录页</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
