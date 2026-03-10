'use client';

import { ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">数字资产托管平台</h1>
            </div>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600">首页</Link>
            <Link href="/payment-application" className="text-slate-700 hover:text-blue-600">支付申请</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">退款政策</h1>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
          <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              退款原则
            </h2>
            <p className="text-slate-700">
              我们致力于为您提供优质的服务。如需申请退款，请仔细阅读以下退款政策。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              一、退款申请条件
            </h2>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2">1.1 可申请退款的情况</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>平台未能按时提供约定服务</li>
                  <li>平台服务存在重大质量问题，影响正常使用</li>
                  <li>因平台技术故障导致服务中断超过24小时</li>
                  <li>法律、法规规定应予退款的其他情形</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  1.2 不予退款的情况
                </h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>用户因个人原因主动申请退款（服务已开始且无质量问题）</li>
                  <li>用户违反服务协议导致服务终止</li>
                  <li>服务已使用超过50%或超过约定服务期限的</li>
                  <li>用户提供虚假信息或恶意申请退款的</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">二、退款申请流程</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">提交申请</h3>
                  <p className="text-slate-700">通过平台客服或邮箱提交退款申请，说明退款原因并提供相关证明材料。</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">审核处理</h3>
                  <p className="text-slate-700">平台将在收到申请后3个工作日内完成审核，并通过邮件或短信通知审核结果。</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">退款执行</h3>
                  <p className="text-slate-700">审核通过后，退款将在5-15个工作日内原路退回至您的支付账户。</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">三、退款金额计算</h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li><strong>全额退款</strong>：符合1.1款规定情形的，退还已支付的全部金额。</li>
                <li><strong>部分退款</strong>：根据实际服务使用情况，扣除相应费用后退还剩余金额。</li>
                <li><strong>手续费</strong>：因支付平台收取的手续费不予退还（如有）。</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">四、退款时效</h2>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                <li>申请审核：3个工作日</li>
                <li>退款到账：5-15个工作日（具体时间以银行或支付平台为准）</li>
                <li>如遇节假日或特殊情况，退款时间可能延长，敬请谅解。</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">五、争议解决</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                如您对退款结果有异议，可在收到审核结果后7个工作日内向平台申诉，平台将重新审核处理。
              </p>
              <p>
                如申诉后仍有争议，可向相关监管部门投诉或通过法律途径解决。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">六、特别说明</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                6.1 本退款政策仅适用于本平台提供的付费服务，不适用于第三方提供的服务。
              </p>
              <p>
                6.2 平台保留根据实际情况修改本退款政策的权利，修改后将及时公示。
              </p>
              <p>
                6.3 如本政策与相关法律法规冲突，以法律法规规定为准。
              </p>
            </div>
          </section>

          <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">联系我们</h2>
            <p className="text-slate-700 mb-2">
              如您有任何退款相关问题，请通过以下方式联系我们：
            </p>
            <ul className="text-slate-700 space-y-1">
              <li>邮箱：support@yugioh.top</li>
              <li>电话：400-XXX-XXXX</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>本退款政策最后更新日期：2024年</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400 text-sm">
            © 2024 yugioh.top 版权所有 | 豫ICP备2026005857号
          </p>
        </div>
      </footer>
    </div>
  );
}
