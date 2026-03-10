'use client';

import { Building, Users, Target, Award, Globe, Heart, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">数字资产托管平台</h1>
            </div>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600">首页</Link>
            <Link href="/payment-application" className="text-slate-700 hover:text-blue-600">支付申请</Link>
            <Link href="/privacy" className="text-slate-700 hover:text-blue-600">隐私政策</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">关于我们</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            专业的数字资产托管服务平台，致力于为用户提供安全、可靠、便捷的托管服务
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Company Overview */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600" />
            公司简介
          </h3>
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-4">
                yugioh.top 是一家专注于数字资产托管服务的专业平台，成立于2024年。我们致力于为用户提供安全、可靠、高效的数字资产托管解决方案，帮助用户实现数字资产的安全存储和便捷管理。
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                平台采用先进的技术架构和严格的安全标准，通过多重加密、权限控制、实时监控等手段，全方位保障用户数字资产的安全。我们的团队由经验丰富的技术专家和安全专家组成，为用户提供7x24小时的技术支持服务。
              </p>
              <p className="text-slate-700 leading-relaxed">
                我们始终坚持"安全第一、服务至上"的理念，严格遵守国家相关法律法规，致力于打造行业领先的数字资产托管服务平台。
              </p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-600" />
            核心价值观
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">安全可靠</h4>
              <p className="text-slate-600">
                采用多重加密和严格的风控体系，确保用户资产安全无忧
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">用户至上</h4>
              <p className="text-slate-600">
                以用户需求为导向，提供优质的服务体验和技术支持
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">专业诚信</h4>
              <p className="text-slate-600">
                专业的技术团队，诚信的服务态度，值得信赖的合作伙伴
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            使命与愿景
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border border-slate-200">
              <h4 className="text-xl font-bold text-slate-900 mb-4">我们的使命</h4>
              <p className="text-slate-700 leading-relaxed">
                为数字资产提供最安全的托管服务，让每一位用户都能放心地管理和保护自己的数字资产，推动数字资产托管行业的健康发展。
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border border-slate-200">
              <h4 className="text-xl font-bold text-slate-900 mb-4">我们的愿景</h4>
              <p className="text-slate-700 leading-relaxed">
                成为国内领先的数字资产托管服务平台，打造安全、可靠、便捷的托管生态系统，让数字资产托管变得简单、高效、可信赖。
              </p>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            公司信息
          </h3>
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-slate-900 mb-3">基本信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">网站名称</span>
                    <span className="text-slate-900 font-medium">数字资产托管平台</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">域名</span>
                    <span className="text-slate-900 font-medium">yugioh.top</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">备案号</span>
                    <span className="text-slate-900 font-medium">豫ICP备2026005857号</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600">成立时间</span>
                    <span className="text-slate-900 font-medium">2024年</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-3">联系方式</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">客服热线</span>
                    <span className="text-slate-900 font-medium">400-XXX-XXXX</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">电子邮箱</span>
                    <span className="text-slate-900 font-medium">support@yugioh.top</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">公司地址</span>
                    <span className="text-slate-900 font-medium">河南省郑州市</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600">工作时间</span>
                    <span className="text-slate-900 font-medium">周一至周日 9:00-21:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            资质认证
          </h3>
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">ICP备案</h4>
                  <p className="text-slate-600 text-sm">豫ICP备2026005857号</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">企业认证</h4>
                  <p className="text-slate-600 text-sm">已通过企业实名认证</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section>
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">立即体验安全托管服务</h3>
            <p className="opacity-90 mb-6">
              登录后即可体验托管服务，让您的数字资产更安全
            </p>
            <Link
              href="/login"
              className="inline-block bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              立即登录
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400 text-sm">
            © 2024 yugioh.top 版权所有 | 豫ICP备2026005857号
          </p>
          <p className="text-slate-500 text-xs mt-2">
            本平台严格遵守《网络安全法》《个人信息保护法》等相关法律法规
          </p>
        </div>
      </footer>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

