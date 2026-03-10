'use client';

import { AlertTriangle, Shield, Eye, Info } from 'lucide-react';
import Link from 'next/link';

export default function DisclaimerPage() {
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
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">免责声明</h1>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
          <section className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              重要提示
            </h2>
            <p className="text-slate-700">
              请您在使用本平台服务前，务必仔细阅读本免责声明。如您使用本平台服务，即视为您已理解并接受本声明全部内容。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">一、平台定位</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                1.1 本平台（yugioh.top）是数字资产托管服务平台，为用户提供数字资产托管、技术支持等服务。
              </p>
              <p>
                1.2 平台承诺遵守国家相关法律法规，依法合规经营。
              </p>
              <p>
                1.3 用户在使用平台服务时，应遵守相关法律法规，不得从事任何违法违规活动。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              二、用户责任
            </h2>
            <div className="text-slate-700 space-y-3">
              <p>
                2.1 用户应确保提供的信息真实、准确、完整，并对信息的真实性承担全部责任。
              </p>
              <p>
                2.2 用户应妥善保管账户信息和密码，对因保管不善造成的损失承担责任。
              </p>
              <p>
                2.3 用户使用本平台服务的行为，应遵守相关法律法规及社会公序良俗。
              </p>
              <p>
                2.4 用户不得利用平台从事任何违法违规活动，包括但不限于：
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>传播违法信息、虚假信息</li>
                <li>侵犯他人知识产权或其他合法权益</li>
                <li>从事网络诈骗、赌博、洗钱等违法犯罪活动</li>
                <li>发布淫秽、色情、暴力等不良信息</li>
                <li>其他违反法律法规或损害他人权益的行为</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">三、服务声明</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                3.1 平台将尽力确保服务的稳定性和安全性，但不承诺服务不中断、无延迟或无错误。
              </p>
              <p>
                3.2 因以下原因导致的服务中断或数据丢失，平台不承担责任：
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>不可抗力（如自然灾害、战争、政府管制等）</li>
                <li>网络故障、设备故障等技术问题</li>
                <li>第三方服务提供方的问题</li>
                <li>用户操作不当或设备问题</li>
                <li>其他平台无法控制的因素</li>
              </ul>
              <p>
                3.3 平台对用户使用服务产生的任何直接或间接损失不承担责任，包括但不限于利润损失、数据丢失、商业机会损失等。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">四、信息准确性</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                4.1 平台努力确保网站信息的准确性、完整性和及时性，但不对此作任何保证。
              </p>
              <p>
                4.2 网站上的信息可能因政策调整、市场变化等原因发生变更，平台不另行通知。
              </p>
              <p>
                4.3 用户在使用本平台服务前，应自行判断相关信息并承担相应风险。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">五、第三方链接</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                5.1 本网站可能包含第三方网站链接，这些链接仅为方便用户而提供。
              </p>
              <p>
                5.2 平台不对第三方网站的内容、隐私政策或服务承担任何责任。
              </p>
              <p>
                5.3 用户访问第三方网站时，应自行判断并承担相应风险。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">六、知识产权</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                6.1 本网站的所有内容（包括但不限于文字、图片、代码、商标等）均受知识产权法保护，未经授权不得使用。
              </p>
              <p>
                6.2 用户上传或发布的内容，应确保不侵犯他人的知识产权或其他合法权益。
              </p>
              <p>
                6.3 如用户上传的内容侵犯他人权益，用户应承担全部责任，平台有权删除相关内容并终止服务。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">七、风险提示</h2>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" />
                数字资产托管服务存在以下风险：
              </h3>
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                <li>技术风险：系统故障、网络攻击等可能导致服务中断</li>
                <li>政策风险：法律法规变化可能影响服务</li>
                <li>市场风险：市场波动可能影响资产价值</li>
                <li>操作风险：用户操作不当可能导致损失</li>
              </ul>
              <p className="text-slate-700 mt-2">
                用户应充分了解相关风险，并根据自身情况谨慎决策。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">八、责任限制</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                8.1 在法律允许的最大范围内，平台对以下情况不承担责任：
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>因用户违反本协议或法律法规导致的任何损失</li>
                <li>因第三方行为导致的任何损失</li>
                <li>因不可抗力导致的任何损失</li>
                <li>因用户设备、网络等环境问题导致的任何损失</li>
              </ul>
              <p>
                8.2 平台的总赔偿责任不超过用户已支付的服务费用。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">九、争议解决</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                9.1 本声明解释权归平台所有。
              </p>
              <p>
                9.2 如发生争议，双方应友好协商解决；协商不成的，任何一方可向平台所在地人民法院提起诉讼。
              </p>
              <p>
                9.3 本声明适用中华人民共和国法律。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">十、声明的修改</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                10.1 平台有权根据业务发展需要修改本声明，修改后的声明将在网站公示。
              </p>
              <p>
                10.2 如您不同意修改后的声明，应停止使用本服务；继续使用即视为接受修改后的声明。
              </p>
            </div>
          </section>

          <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">联系我们</h2>
            <p className="text-slate-700 mb-2">
              如您对本免责声明有任何疑问，请通过以下方式联系我们：
            </p>
            <ul className="text-slate-700 space-y-1">
              <li>邮箱：support@yugioh.top</li>
              <li>电话：400-XXX-XXXX</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>本免责声明最后更新日期：2024年</p>
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
