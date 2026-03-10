'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';

export default function TestPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // 测试API并记录结果
  const testApi = async (testName: string, apiCall: () => Promise<any>) => {
    setLoading({ ...loading, [testName]: true });
    try {
      const result = await apiCall();
      setResults({ ...results, [testName]: { success: true, data: result, timestamp: new Date().toLocaleTimeString() } });
    } catch (error: any) {
      setResults({ ...results, [testName]: { success: false, error: error.message, timestamp: new Date().toLocaleTimeString() } });
    } finally {
      setLoading({ ...loading, [testName]: false });
    }
  };

  // 1. 测试获取上架保证金金额
  const testGetListingDeposit = async () => {
    const response = await fetch('/api/settings/listing-deposit');
    return await response.json();
  };

  // 2. 测试获取待审核账号列表
  const testGetPendingAccounts = async () => {
    const response = await fetch('/api/admin/accounts/pending-audit?page=1&pageSize=10');
    return await response.json();
  };

  // 3. 测试获取超时订单列表
  const testGetTimeoutOrders = async () => {
    const response = await fetch('/api/orders/check-timeout');
    return await response.json();
  };

  // 4. 测试获取账号列表
  const testGetAccounts = async () => {
    const response = await fetch('/api/accounts?auditStatus=approved');
    return await response.json();
  };

  // 5. 测试自动分账（需要订单ID）
  const testAutoSplit = async () => {
    const orderId = document.getElementById('order-id-input') as HTMLInputElement;
    if (!orderId || !orderId.value) {
      throw new Error('请输入订单ID');
    }
    const response = await fetch(`/api/orders/${orderId.value}/auto-split`, {
      method: 'POST'
    });
    return await response.json();
  };

  // 6. 测试账号审核通过
  const testApproveAccount = async () => {
    const accountId = document.getElementById('audit-account-id-input') as HTMLInputElement;
    const auditUserId = document.getElementById('audit-user-id-input') as HTMLInputElement;
    if (!accountId || !accountId.value || !auditUserId || !auditUserId.value) {
      throw new Error('请输入账号ID和审核人ID');
    }
    const response = await fetch(`/api/admin/accounts/${accountId.value}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        auditUserId: auditUserId.value
      })
    });
    return await response.json();
  };

  // 7. 测试账号审核拒绝
  const testRejectAccount = async () => {
    const accountId = document.getElementById('audit-account-id-input') as HTMLInputElement;
    const auditUserId = document.getElementById('audit-user-id-input') as HTMLInputElement;
    const reason = document.getElementById('reject-reason-input') as HTMLInputElement;
    if (!accountId || !accountId.value || !auditUserId || !auditUserId.value) {
      throw new Error('请输入账号ID和审核人ID');
    }
    if (!reason || !reason.value) {
      throw new Error('请输入拒绝原因');
    }
    const response = await fetch(`/api/admin/accounts/${accountId.value}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject',
        auditUserId: auditUserId.value,
        reason: reason.value
      })
    });
    return await response.json();
  };

  // 8. 测试检查并取消超时订单
  const testCheckTimeoutOrders = async () => {
    const response = await fetch('/api/orders/check-timeout', {
      method: 'POST'
    });
    return await response.json();
  };

  // 9. 测试冻结保证金
  const testFreezeDeposit = async () => {
    const accountId = document.getElementById('deposit-account-id-input') as HTMLInputElement;
    const userId = document.getElementById('deposit-user-id-input') as HTMLInputElement;
    if (!accountId || !accountId.value || !userId || !userId.value) {
      throw new Error('请输入账号ID和用户ID');
    }
    const response = await fetch(`/api/accounts/${accountId.value}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'freeze',
        userId: userId.value
      })
    });
    return await response.json();
  };

  // 10. 测试退还保证金
  const testRefundDeposit = async () => {
    const accountId = document.getElementById('deposit-account-id-input') as HTMLInputElement;
    const reasonSelect = document.getElementById('refund-reason-select') as HTMLSelectElement;
    if (!accountId || !accountId.value) {
      throw new Error('请输入账号ID');
    }
    const response = await fetch(`/api/accounts/${accountId.value}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refund',
        reason: reasonSelect.value
      })
    });
    return await response.json();
  };

  // 清除所有结果
  const clearResults = () => {
    setResults({});
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">功能综合测试页面</h1>
        <p className="text-muted-foreground">测试所有新增的P0级别核心功能</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={clearResults} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          清除结果
        </Button>
      </div>

      <Tabs defaultValue="auto-split" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-6">
          <TabsTrigger value="auto-split">自动分账</TabsTrigger>
          <TabsTrigger value="audit">账号审核</TabsTrigger>
          <TabsTrigger value="deposit">保证金管理</TabsTrigger>
          <TabsTrigger value="timeout">订单超时</TabsTrigger>
          <TabsTrigger value="notification">通知机制</TabsTrigger>
          <TabsTrigger value="other">其他</TabsTrigger>
        </TabsList>

        {/* 自动分账系统 */}
        <TabsContent value="auto-split" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自动分账系统测试</CardTitle>
              <CardDescription>测试订单完成后的自动分账功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="order-id-input">订单ID</Label>
                  <Input id="order-id-input" placeholder="输入订单ID" />
                </div>
                <Button
                  onClick={() => testApi('auto-split', testAutoSplit)}
                  disabled={loading['auto-split']}
                >
                  {loading['auto-split'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  执行自动分账
                </Button>
              </div>

              {results['auto-split'] && (
                <div className={`p-4 rounded-lg ${results['auto-split'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {results['auto-split'].success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1">
                        {results['auto-split'].success ? '测试成功' : '测试失败'}
                      </p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(results['auto-split'].success ? results['auto-split'].data : results['auto-split'].error, null, 2)}
                      </pre>
                      <p className="text-xs text-muted-foreground mt-1">{results['auto-split'].timestamp}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订单超时处理 */}
        <TabsContent value="timeout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>订单超时处理测试</CardTitle>
              <CardDescription>测试超时订单的检查和自动取消功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => testApi('get-timeout-orders', testGetTimeoutOrders)}
                  disabled={loading['get-timeout-orders']}
                >
                  {loading['get-timeout-orders'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  获取超时订单
                </Button>
                <Button
                  onClick={() => testApi('check-timeout-orders', testCheckTimeoutOrders)}
                  disabled={loading['check-timeout-orders']}
                >
                  {loading['check-timeout-orders'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  检查并取消超时订单
                </Button>
              </div>

              {(results['get-timeout-orders'] || results['check-timeout-orders']) && (
                <div className="space-y-4">
                  {results['get-timeout-orders'] && (
                    <div className={`p-4 rounded-lg ${results['get-timeout-orders'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-start gap-2">
                        {results['get-timeout-orders'].success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium mb-1">获取超时订单</p>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                            {JSON.stringify(results['get-timeout-orders'].success ? results['get-timeout-orders'].data : results['get-timeout-orders'].error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                  {results['check-timeout-orders'] && (
                    <div className={`p-4 rounded-lg ${results['check-timeout-orders'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-start gap-2">
                        {results['check-timeout-orders'].success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium mb-1">检查并取消超时订单</p>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                            {JSON.stringify(results['check-timeout-orders'].success ? results['check-timeout-orders'].data : results['check-timeout-orders'].error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 账号审核机制 */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>账号审核机制测试</CardTitle>
              <CardDescription>测试账号的审核通过和拒绝功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  onClick={() => testApi('get-pending-accounts', testGetPendingAccounts)}
                  disabled={loading['get-pending-accounts']}
                >
                  {loading['get-pending-accounts'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  获取待审核账号
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="audit-account-id-input">账号ID</Label>
                  <Input id="audit-account-id-input" placeholder="输入要审核的账号ID" />
                </div>
                <div>
                  <Label htmlFor="audit-user-id-input">审核人ID</Label>
                  <Input id="audit-user-id-input" placeholder="输入审核人ID" />
                </div>
                <div>
                  <Label htmlFor="reject-reason-input">拒绝原因（仅拒绝时需要）</Label>
                  <Input id="reject-reason-input" placeholder="输入拒绝原因" />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => testApi('approve-account', testApproveAccount)}
                    disabled={loading['approve-account']}
                  >
                    {loading['approve-account'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    审核通过
                  </Button>
                  <Button
                    onClick={() => testApi('reject-account', testRejectAccount)}
                    disabled={loading['reject-account']}
                    variant="destructive"
                  >
                    {loading['reject-account'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    审核拒绝
                  </Button>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {results['get-pending-accounts'] && (
                  <div className={`p-4 rounded-lg ${results['get-pending-accounts'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['get-pending-accounts'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">获取待审核账号</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['get-pending-accounts'].success ? results['get-pending-accounts'].data : results['get-pending-accounts'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {(results['approve-account'] || results['reject-account']) && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      {results['approve-account'] && (
                        <div className={`p-4 rounded-lg ${results['approve-account'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-start gap-2">
                            {results['approve-account'].success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-1">审核通过</p>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {JSON.stringify(results['approve-account'].success ? results['approve-account'].data : results['approve-account'].error, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                      {results['reject-account'] && (
                        <div className={`p-4 rounded-lg ${results['reject-account'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-start gap-2">
                            {results['reject-account'].success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-1">审核拒绝</p>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {JSON.stringify(results['reject-account'].success ? results['reject-account'].data : results['reject-account'].error, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="qrcode-order-id-input">订单ID (扫码登录)</Label>
                    <Input id="qrcode-order-id-input" placeholder="输入订单ID获取扫码登录信息" />
                  </div>
                  <Button
                    onClick={() => {
                      const orderId = (document.getElementById('qrcode-order-id-input') as HTMLInputElement)?.value;
                      if (!orderId) {
                        alert('请输入订单ID');
                        return;
                      }
                      testApi('get-order-qrcode', async () => {
                        const response = await fetch(`/api/orders/${orderId}/qrcode`);
                        return await response.json();
                      });
                    }}
                    disabled={loading['get-order-qrcode']}
                  >
                    {loading['get-order-qrcode'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    获取订单扫码登录信息
                  </Button>
                </div>

                <div className="space-y-2">
                  {results['approve-account'] && (
                      <div className={`p-4 rounded-lg ${results['approve-account'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-start gap-2">
                          {results['approve-account'].success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium mb-1">审核通过</p>
                            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                              {JSON.stringify(results['approve-account'].success ? results['approve-account'].data : results['approve-account'].error, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                    {results['reject-account'] && (
                      <div className={`p-4 rounded-lg ${results['reject-account'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-start gap-2">
                          {results['reject-account'].success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium mb-1">审核拒绝</p>
                            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                              {JSON.stringify(results['reject-account'].success ? results['reject-account'].data : results['reject-account'].error, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 上架保证金机制 */}
        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>上架保证金机制测试</CardTitle>
              <CardDescription>测试保证金的冻结和退还功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  onClick={() => testApi('get-listing-deposit', testGetListingDeposit)}
                  disabled={loading['get-listing-deposit']}
                >
                  {loading['get-listing-deposit'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  获取保证金金额配置
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="deposit-account-id-input">账号ID</Label>
                  <Input id="deposit-account-id-input" placeholder="输入账号ID" />
                </div>
                <div>
                  <Label htmlFor="deposit-user-id-input">用户ID</Label>
                  <Input id="deposit-user-id-input" placeholder="输入用户ID（冻结时需要）" />
                </div>
                <div>
                  <Label htmlFor="refund-reason-select">退还原因</Label>
                  <select id="refund-reason-select" className="w-full px-3 py-2 border rounded-md">
                    <option value="cancelled">账号下架</option>
                    <option value="completed">订单完成</option>
                    <option value="rejected">审核拒绝</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => testApi('freeze-deposit', testFreezeDeposit)}
                    disabled={loading['freeze-deposit']}
                  >
                    {loading['freeze-deposit'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    冻结保证金
                  </Button>
                  <Button
                    onClick={() => testApi('refund-deposit', testRefundDeposit)}
                    disabled={loading['refund-deposit']}
                    variant="outline"
                  >
                    {loading['refund-deposit'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    退还保证金
                  </Button>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {results['get-listing-deposit'] && (
                  <div className={`p-4 rounded-lg ${results['get-listing-deposit'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['get-listing-deposit'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">获取保证金金额配置</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['get-listing-deposit'].success ? results['get-listing-deposit'].data : results['get-listing-deposit'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {(results['freeze-deposit'] || results['refund-deposit']) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {results['freeze-deposit'] && (
                        <div className={`p-4 rounded-lg ${results['freeze-deposit'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-start gap-2">
                            {results['freeze-deposit'].success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-1">冻结保证金</p>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {JSON.stringify(results['freeze-deposit'].success ? results['freeze-deposit'].data : results['freeze-deposit'].error, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                      {results['refund-deposit'] && (
                        <div className={`p-4 rounded-lg ${results['refund-deposit'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-start gap-2">
                            {results['refund-deposit'].success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-1">退还保证金</p>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {JSON.stringify(results['refund-deposit'].success ? results['refund-deposit'].data : results['refund-deposit'].error, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="freeze-deposit-order-id-input">订单ID (冻结保证金)</Label>
                    <Input id="freeze-deposit-order-id-input" placeholder="输入订单ID冻结保证金" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const orderId = (document.getElementById('freeze-deposit-order-id-input') as HTMLInputElement)?.value;
                        if (!orderId) {
                          alert('请输入订单ID');
                          return;
                        }
                        testApi('freeze-deposit', async () => {
                          const response = await fetch(`/api/deposits/freeze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId })
                          });
                          return await response.json();
                        });
                      }}
                      disabled={loading['freeze-deposit']}
                    >
                      {loading['freeze-deposit'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                      冻结保证金
                    </Button>
                    <Button
                      onClick={() => {
                        const orderId = (document.getElementById('freeze-deposit-order-id-input') as HTMLInputElement)?.value;
                        if (!orderId) {
                          alert('请输入订单ID');
                          return;
                        }
                        testApi('refund-deposit', async () => {
                          const response = await fetch(`/api/deposits/refund`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId })
                          });
                          return await response.json();
                        });
                      }}
                      disabled={loading['refund-deposit']}
                    >
                      {loading['refund-deposit'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                      退还保证金
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知机制测试 */}
        <TabsContent value="notification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知机制测试</CardTitle>
              <CardDescription>测试账号被租后的通知功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="notification-order-id-input">订单ID</Label>
                  <Input id="notification-order-id-input" placeholder="输入订单ID" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="create-chat-group" defaultChecked />
                  <Label htmlFor="create-chat-group">同时创建群聊</Label>
                </div>
                <Button
                  onClick={() => {
                    const orderId = (document.getElementById('notification-order-id-input') as HTMLInputElement)?.value;
                    if (!orderId) {
                      alert('请输入订单ID');
                      return;
                    }
                    const createChatGroup = (document.getElementById('create-chat-group') as HTMLInputElement)?.checked;
                    testApi('send-account-rented-notification', async () => {
                      const response = await fetch(`/api/notifications/send-account-rented`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId, createChatGroup })
                      });
                      return await response.json();
                    });
                  }}
                  disabled={loading['send-account-rented-notification']}
                >
                  {loading['send-account-rented-notification'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  发送账号被租通知
                </Button>
              </div>

              {results['send-account-rented-notification'] && (
                <div className={`p-4 rounded-lg ${results['send-account-rented-notification'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {results['send-account-rented-notification'].success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1">发送账号被租通知</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(results['send-account-rented-notification'].success ? results['send-account-rented-notification'].data : results['send-account-rented-notification'].error, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 mt-4">
                <div>
                  <Label htmlFor="order-paid-notification-order-id-input">订单ID</Label>
                  <Input id="order-paid-notification-order-id-input" placeholder="输入订单ID" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="create-chat-group-paid" defaultChecked />
                  <Label htmlFor="create-chat-group-paid">同时创建群聊</Label>
                </div>
                <Button
                  onClick={() => {
                    const orderId = (document.getElementById('order-paid-notification-order-id-input') as HTMLInputElement)?.value;
                    const createChatGroup = (document.getElementById('create-chat-group-paid') as HTMLInputElement)?.checked;
                    if (!orderId) {
                      alert('请输入订单ID');
                      return;
                    }
                    testApi('send-order-paid-notification', async () => {
                      const response = await fetch('/api/notifications/order-paid', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId, createChatGroup })
                      });
                      return await response.json();
                    });
                  }}
                  disabled={loading['send-order-paid-notification']}
                >
                  {loading['send-order-paid-notification'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  发送订单支付成功通知
                </Button>
              </div>

              {results['send-order-paid-notification'] && (
                <div className={`p-4 rounded-lg ${results['send-order-paid-notification'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {results['send-order-paid-notification'].success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1">发送订单支付成功通知</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(results['send-order-paid-notification'].success ? results['send-order-paid-notification'].data : results['send-order-paid-notification'].error, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="notification-user-id-input">用户ID</Label>
                  <Input id="notification-user-id-input" placeholder="输入用户ID" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="include-read-notifications" />
                  <Label htmlFor="include-read-notifications">包含已读通知</Label>
                </div>
                <Button
                  onClick={() => {
                    const userId = (document.getElementById('notification-user-id-input') as HTMLInputElement)?.value;
                    const includeRead = (document.getElementById('include-read-notifications') as HTMLInputElement)?.checked;
                    if (!userId) {
                      alert('请输入用户ID');
                      return;
                    }
                    testApi('get-user-notifications', async () => {
                      const response = await fetch(`/api/notifications?userId=${userId}&includeRead=${includeRead}`);
                      return await response.json();
                    });
                  }}
                  disabled={loading['get-user-notifications']}
                >
                  {loading['get-user-notifications'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  获取用户通知列表
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="mark-read-user-id-input">用户ID</Label>
                  <Input id="mark-read-user-id-input" placeholder="输入用户ID" />
                </div>
                <Button
                  onClick={() => {
                    const userId = (document.getElementById('mark-read-user-id-input') as HTMLInputElement)?.value;
                    if (!userId) {
                      alert('请输入用户ID');
                      return;
                    }
                    testApi('mark-all-read', async () => {
                      const response = await fetch('/api/notifications', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId })
                      });
                      return await response.json();
                    });
                  }}
                  disabled={loading['mark-all-read']}
                >
                  {loading['mark-all-read'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  标记所有通知为已读
                </Button>
              </div>

              {results['send-order-paid-notification'] && (
                <div className={`p-4 rounded-lg ${results['send-order-paid-notification'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {results['send-order-paid-notification'].success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1">发送订单支付成功通知</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(results['send-order-paid-notification'].success ? results['send-order-paid-notification'].data : results['send-order-paid-notification'].error, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="qrcode-order-id-input">订单ID (扫码登录)</Label>
                  <Input id="qrcode-order-id-input" placeholder="输入订单ID获取扫码登录信息" />
                </div>
                <Button
                  onClick={() => {
                    const orderId = (document.getElementById('qrcode-order-id-input') as HTMLInputElement)?.value;
                    if (!orderId) {
                      alert('请输入订单ID');
                      return;
                    }
                    testApi('get-order-qrcode', async () => {
                      const response = await fetch(`/api/orders/${orderId}/qrcode`);
                      return await response.json();
                    });
                  }}
                  disabled={loading['get-order-qrcode']}
                >
                  {loading['get-order-qrcode'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  获取订单扫码登录信息
                </Button>
              </div>

              <div className="space-y-2">
                {results['get-order-qrcode'] && (
                  <div className={`p-4 rounded-lg ${results['get-order-qrcode'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['get-order-qrcode'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">获取订单扫码登录信息</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['get-order-qrcode'].success ? results['get-order-qrcode'].data : results['get-order-qrcode'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {results['get-user-notifications'] && (
                  <div className={`p-4 rounded-lg ${results['get-user-notifications'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['get-user-notifications'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">获取用户通知列表</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['get-user-notifications'].success ? results['get-user-notifications'].data : results['get-user-notifications'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {results['send-order-paid-notification'] && (
                  <div className={`p-4 rounded-lg ${results['send-order-paid-notification'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['send-order-paid-notification'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">发送订单支付成功通知</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['send-order-paid-notification'].success ? results['send-order-paid-notification'].data : results['send-order-paid-notification'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {results['mark-all-read'] && (
                  <div className={`p-4 rounded-lg ${results['mark-all-read'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {results['mark-all-read'].success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">标记所有通知为已读</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(results['mark-all-read'].success ? results['mark-all-read'].data : results['mark-all-read'].error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 其他测试 */}
        <TabsContent value="other" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>其他功能测试</CardTitle>
              <CardDescription>测试账号列表等基础功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => testApi('get-accounts', testGetAccounts)}
                disabled={loading['get-accounts']}
              >
                {loading['get-accounts'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                获取已审核通过的账号列表
              </Button>

              {results['get-accounts'] && (
                <div className={`p-4 rounded-lg ${results['get-accounts'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {results['get-accounts'].success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1">获取账号列表</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(results['get-accounts'].success ? results['get-accounts'].data : results['get-accounts'].error, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
