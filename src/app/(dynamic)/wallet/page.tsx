'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, RefreshCw } from 'lucide-react';
import { formatBalance } from '@/lib/balance-service';

interface UserBalance {
  id: string;
  user_id: string;
  user_type: 'buyer' | 'seller';
  available_balance: number;
  frozen_balance: number;
  total_balance: number;
  total_withdrawn: number;
  total_recharged: number;
  total_income: number;
  total_refund: number;
  created_at: string;
  updated_at: string;
}

interface BalanceTransaction {
  id: string;
  transaction_no: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  available_balance_before: number;
  available_balance_after: number;
  frozen_balance_before: number;
  frozen_balance_after: number;
  related_order_id?: string;
  related_withdrawal_id?: string;
  related_refund_id?: string;
  related_payment_id?: string;
  remark?: string;
  created_at: string;
}

export default function WalletPage() {
  const [userId] = useState('U001'); // 模拟用户ID
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  // 加载余额信息
  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, [userId]);

  const loadBalance = async () => {
    try {
      const response = await fetch(`/api/balance?user_id=${userId}`);
      const data = await response.json();
      if (data.success) {
        setBalance(data.data);
      }
    } catch (error) {
      console.error('加载余额失败:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/balance?user_id=${userId}&type=transactions`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('加载交易记录失败:', error);
    }
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert('请输入有效的充值金额');
      return;
    }

    try {
      setLoading(true);
      // 模拟充值
      alert(`充值 ¥${rechargeAmount} 成功！`);
      setRechargeAmount('');
      loadBalance();
      loadTransactions();
    } catch (error) {
      console.error('充值失败:', error);
      alert('充值失败');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      deposit: '充值',
      withdraw: '提现',
      refund: '退款',
      income: '收入',
      penalty: '扣款',
      deposit_refund: '押金退还',
      deposit_freeze: '押金冻结',
      deposit_unfreeze: '押金解冻',
      commission: '平台佣金',
      rent_income: '租金收入',
      platform_income: '平台收入'
    };
    return typeMap[type] || '未知';
  };

  const getTransactionTypeColor = (type: string): string => {
    if (type === 'withdraw' || type === 'penalty' || type === 'deposit_freeze') {
      return 'text-red-500';
    }
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的钱包</h1>
            <p className="text-gray-600 mt-1">管理您的余额和交易记录</p>
          </div>
          <Button onClick={() => { loadBalance(); loadTransactions(); }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        {balance && (
          <>
            {/* 余额卡片 */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">可用余额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatBalance(balance.available_balance)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">可提现金额</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">冻结余额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatBalance(balance.frozen_balance)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">订单押金等</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">总余额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatBalance(balance.total_balance)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">可用 + 冻结</p>
                </CardContent>
              </Card>
            </div>

            {/* 统计信息 */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">累计充值</p>
                      <p className="text-xl font-bold mt-1">{formatBalance(balance.total_recharged)}</p>
                    </div>
                    <ArrowDownLeft className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">累计提现</p>
                      <p className="text-xl font-bold mt-1">{formatBalance(balance.total_withdrawn)}</p>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">累计收入</p>
                      <p className="text-xl font-bold mt-1">{formatBalance(balance.total_income)}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">累计退款</p>
                      <p className="text-xl font-bold mt-1">{formatBalance(balance.total_refund)}</p>
                    </div>
                    <History className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 充值和交易记录 */}
        <Tabs defaultValue="recharge">
          <TabsList>
            <TabsTrigger value="recharge">充值</TabsTrigger>
            <TabsTrigger value="transactions">交易记录</TabsTrigger>
          </TabsList>

          <TabsContent value="recharge" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>账户充值</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>充值金额</Label>
                  <Input
                    type="number"
                    placeholder="请输入充值金额"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2">
                  {[100, 200, 500, 1000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setRechargeAmount(amount.toString())}
                    >
                      ¥{amount}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleRecharge}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? '处理中...' : '立即充值'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  * 此为模拟充值，实际支付需要接入第三方支付接口
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>交易记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无交易记录
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getTransactionTypeText(transaction.transaction_type)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {transaction.transaction_no}
                            </span>
                          </div>
                          {transaction.remark && (
                            <p className="text-sm text-gray-600 mt-1">{transaction.remark}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(transaction.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className={`text-lg font-semibold ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatBalance(transaction.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
