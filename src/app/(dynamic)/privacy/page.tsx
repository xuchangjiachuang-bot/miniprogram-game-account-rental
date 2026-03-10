'use client';

import { Shield, Eye, Lock, UserCheck, Database, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">数字资产托管平台</h1>
            </div>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600">首页</Link>
            <Link href="/payment-application" className="text-slate-700 hover:text-blue-600">支付申请</Link>
            <Link href="/terms" className="text-slate-700 hover:text-blue-600">用户协议</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">隐私政策</h1>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              引言
            </h2>
            <p className="text-slate-700 leading-relaxed">
              欢迎使用数字资产托管平台（以下简称"我们"或"平台"）。我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们致力于维持您对我们的信任，恪守以下原则，保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最少够用原则、确保安全原则、主体参与原则、公开透明原则等。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              我们如何收集和使用您的个人信息
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              我们会遵循正当、合法、必要的原则，仅为实现产品功能及提供服务之目的，收集和使用您的个人信息。
            </p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">收集的个人信息包括：</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                <li>注册信息：手机号、用户名等</li>
                <li>身份信息：真实姓名、身份证号（用于实名认证）</li>
                <li>联系信息：电子邮箱、电话号码</li>
                <li>交易信息：托管服务相关的订单信息</li>
                <li>设备信息：设备型号、操作系统版本、IP地址等</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              我们如何保护您的个人信息
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              我们采取业界标准的安全措施来保护您的个人信息安全，包括：
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>数据加密传输和存储</li>
              <li>严格的访问权限控制</li>
              <li>定期的安全审计和漏洞扫描</li>
              <li>安全事件应急响应机制</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              个人信息的存储期限
            </h2>
            <p className="text-slate-700 leading-relaxed">
              我们仅在实现目的所必需的最短期限内保留您的个人信息，除非法律法规要求或允许延长保留期限。超出保留期限后，我们会删除或匿名化处理您的个人信息。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              您的权利
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              根据相关法律法规，您在个人信息处理活动中享有以下权利：
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>查阅、复制您的个人信息</li>
              <li>更正、补充您的个人信息</li>
              <li>删除您的个人信息</li>
              <li>撤回对个人信息处理的同意</li>
              <li>注销账户</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">未成年人保护</h2>
            <p className="text-slate-700 leading-relaxed">
              我们非常重视对未成年人个人信息的保护。如果您是18周岁以下的未成年人，建议您在监护人指导下阅读和使用本服务。如您是未成年人的监护人，请您仔细阅读本隐私政策，并帮助未成年人完成相关操作。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">本政策的更新</h2>
            <p className="text-slate-700 leading-relaxed">
              我们可能适时更新本隐私政策。未经您明确同意，我们不会削减您按照本隐私政策所应享有的权利。如该等更新导致您在本政策项下权利的实质减少，我们将在更新生效前通过在主页上显著位置提示或向您发送电子邮件等方式通知您。
            </p>
          </section>

          <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">联系我们</h2>
            <p className="text-slate-700 mb-2">
              如您对本隐私政策有任何疑问、意见或建议，请通过以下方式与我们联系：
            </p>
            <ul className="text-slate-700 space-y-1">
              <li>邮箱：support@yugioh.top</li>
              <li>电话：400-XXX-XXXX</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>本隐私政策最后更新日期：2024年</p>
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
