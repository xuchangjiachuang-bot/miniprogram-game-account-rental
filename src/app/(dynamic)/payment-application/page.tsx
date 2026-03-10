'use client';

import { Shield, Lock, Users, Globe, FileText, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function PaymentApplicationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">数字资产托管平台</h1>
              <p className="text-sm text-slate-600">Digital Asset Custody Platform</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600">首页</Link>
            <Link href="/about" className="text-slate-700 hover:text-blue-600">关于我们</Link>
            <Link href="/privacy" className="text-slate-700 hover:text-blue-600">隐私政策</Link>
            <Link href="/terms" className="text-slate-700 hover:text-blue-600">用户协议</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            专业数字资产托管服务平台
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            为数字资产提供安全、可靠、专业的托管与技术服务
          </p>
          <div className="inline-block bg-blue-50 border-2 border-blue-200 rounded-xl px-8 py-4 mb-8">
            <p className="text-sm text-slate-600 mb-1">官方网址</p>
            <p className="text-2xl font-bold text-blue-600">https://hfb.yugioh.top</p>
          </div>
        </div>
      </section>

      {/* Business Description */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">平台简介</h3>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
            <p className="text-slate-700 leading-relaxed mb-6">
              <strong>yugioh.top</strong> 是一家专业的数字资产托管服务平台，致力于为用户提供安全、便捷、可信赖的数字资产托管服务。
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              平台采用先进的加密技术和严格的风控体系，确保用户数字资产的安全存储和稳定运行。我们提供全方位的技术服务支持，包括资产安全管理、权限控制、实时监控、风险预警等功能，帮助用户实现数字资产的高效管理和价值保护。
            </p>
            <p className="text-slate-700 leading-relaxed">
              我们始终坚持"安全第一、服务至上"的理念，严格遵守国家相关法律法规，致力于打造行业领先的数字资产托管服务平台。
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">核心服务</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">资产托管服务</h4>
              <p className="text-slate-600">提供专业的数字资产托管服务，采用多重加密技术确保资产安全</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">安全管理服务</h4>
              <p className="text-slate-600">全方位的安全监控和风险预警系统，实时保护用户资产安全</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">技术服务支持</h4>
              <p className="text-slate-600">提供7x24小时专业技术支持，确保服务稳定运行</p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Info */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">合规信息</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-start gap-4">
                <Globe className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">网站信息</h4>
                  <p className="text-slate-600 mb-1"><strong>域名：</strong>yugioh.top</p>
                  <p className="text-slate-600 mb-1"><strong>网站名称：</strong>数字资产托管平台</p>
                  <p className="text-slate-600"><strong>网站类型：</strong>数字资产托管服务</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-start gap-4">
                <FileText className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">备案信息</h4>
                  <p className="text-slate-600 mb-1"><strong>备案号：</strong>豫ICP备2026005857号</p>
                  <p className="text-slate-600 mb-1"><strong>主体性质：</strong>企业</p>
                  <p className="text-slate-600"><strong>审核通过时间：</strong>2024年</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">联系我们</h3>
          <div className="bg-white rounded-xl p-8 border border-slate-200 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">客服热线</p>
                  <p className="text-lg font-bold text-slate-900">400-XXX-XXXX</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">电子邮箱</p>
                  <p className="text-lg font-bold text-slate-900">support@yugioh.top</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">公司地址</p>
                  <p className="text-lg font-bold text-slate-900">河南省郑州市（请补充完整地址）</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-bold mb-4">关于我们</h4>
              <p className="text-slate-400 text-sm">
                专业的数字资产托管服务平台，致力于为用户提供安全、可靠的托管服务
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">快速链接</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <Link href="/" className="block hover:text-white">首页</Link>
                <Link href="/about" className="block hover:text-white">关于我们</Link>
                <Link href="/privacy" className="block hover:text-white">隐私政策</Link>
                <Link href="/terms" className="block hover:text-white">用户协议</Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">法律文件</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <Link href="/privacy" className="block hover:text-white">隐私政策</Link>
                <Link href="/terms" className="block hover:text-white">服务协议</Link>
                <Link href="/refund" className="block hover:text-white">退款政策</Link>
                <Link href="/disclaimer" className="block hover:text-white">免责声明</Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">联系信息</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <p>邮箱：support@yugioh.top</p>
                <p>电话：400-XXX-XXXX</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              © 2024 yugioh.top 版权所有 | 豫ICP备2026005857号
            </p>
            <p className="text-slate-500 text-xs mt-2">
              本平台严格遵守《网络安全法》《个人信息保护法》等相关法律法规
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
