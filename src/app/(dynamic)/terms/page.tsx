'use client';

import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">用户服务协议</h1>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              特别提示
            </h2>
            <p className="text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-200">
              请您在使用本平台提供的服务前，务必仔细阅读并透彻理解本协议。如您对本协议有任何疑问，可向平台客服咨询。如您不同意本协议的任何内容，或者无法准确理解相关条款的含义，请不要进行后续操作。您的使用行为将被视为对本协议的完全接受。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">一、服务说明</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                1.1 本平台是由yugioh.top运营的数字资产托管服务平台，为用户提供数字资产托管、技术支持等服务。
              </p>
              <p>
                1.2 用户在注册、使用本平台服务时，应当具备完全民事行为能力。如用户为限制民事行为能力人，应在监护人监护下使用本服务。
              </p>
              <p>
                1.3 用户应确保其提供的信息真实、准确、完整，并在信息发生变化时及时更新。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">二、用户账户</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                2.1 用户注册成功后，将获得本平台账户及相应的用户名和密码。用户应妥善保管账户信息，不得将账户转让、出借或提供给他人使用。
              </p>
              <p>
                2.2 用户对通过其账户进行的所有活动承担责任。如发现账户被盗用，应立即通知平台。
              </p>
              <p>
                2.3 平台有权根据用户提供的资料进行实名认证。用户应配合完成实名认证，未完成认证的用户可能无法使用部分服务。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">三、服务内容</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                3.1 平台提供的主要服务包括：数字资产托管、安全管理、技术支持等。
              </p>
              <p>
                3.2 平台将根据实际情况提供服务，并有权对服务内容进行更新、调整或停止。
              </p>
              <p>
                3.3 用户在使用服务过程中，应遵守相关法律法规及本协议约定，不得利用平台从事任何违法违规活动。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">四、用户权利和义务</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                4.1 用户享有依法获得本平台服务的权利。
              </p>
              <p>
                4.2 用户应遵守国家法律法规、本协议及平台规则，不得利用平台进行任何违法违规活动。
              </p>
              <p>
                4.3 用户不得发布违法信息、虚假信息或侵犯他人合法权益的信息。
              </p>
              <p>
                4.4 用户应妥善保管自己的账户信息和密码，对因保管不善造成的损失承担责任。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">五、平台权利和义务</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                5.1 平台有权根据业务发展需要，对服务内容、收费标准等进行调整，调整后将及时公告。
              </p>
              <p>
                5.2 平台有权对用户使用服务情况进行监督，如发现违规行为，有权采取相应措施，包括但不限于警告、限制使用、终止服务等。
              </p>
              <p>
                5.3 平台应采取必要的安全措施保护用户信息和资产安全。
              </p>
              <p>
                5.4 平台承诺遵守相关法律法规，保护用户合法权益。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">六、费用支付</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                6.1 平台提供的部分服务可能需要支付相应费用，具体收费标准以平台公示为准。
              </p>
              <p>
                6.2 用户应按照约定支付相关费用，如逾期未支付，平台有权暂停或终止提供相应服务。
              </p>
              <p>
                6.3 退款政策详见《退款政策》条款。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              七、违约责任
            </h2>
            <div className="text-slate-700 space-y-3">
              <p>
                7.1 如用户违反本协议约定，平台有权采取相应措施，并保留追究法律责任的权利。
              </p>
              <p>
                7.2 如用户因违规行为给平台或其他用户造成损失的，应承担相应的赔偿责任。
              </p>
              <p>
                7.3 因不可抗力导致本协议无法履行的，双方均不承担违约责任。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">八、免责条款</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                8.1 因黑客攻击、病毒入侵、政府管制等不可抗力因素导致的服务中断或数据丢失，平台不承担责任。
              </p>
              <p>
                8.2 用户因自身原因（如账户被盗、密码泄露等）造成的损失，平台不承担责任。
              </p>
              <p>
                8.3 平台对第三方提供的服务不承担担保责任。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">九、协议的变更和终止</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                9.1 平台有权根据业务发展需要修改本协议，修改后的协议将在平台公告，用户继续使用服务视为接受修改后的协议。
              </p>
              <p>
                9.2 用户有权随时终止使用本服务，并注销账户。
              </p>
              <p>
                9.3 如用户严重违反本协议约定，平台有权终止向其提供服务。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">十、争议解决</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                10.1 本协议的解释权归平台所有。
              </p>
              <p>
                10.2 如发生争议，双方应友好协商解决；协商不成的，任何一方可向平台所在地人民法院提起诉讼。
              </p>
              <p>
                10.3 本协议适用中华人民共和国法律。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">十一、其他</h2>
            <div className="text-slate-700 space-y-3">
              <p>
                11.1 本协议自用户同意之日起生效。
              </p>
              <p>
                11.2 本协议未尽事宜，按照国家有关法律法规执行。
              </p>
              <p>
                11.3 本协议中的标题仅为方便阅读而设，不影响条款含义。
              </p>
            </div>
          </section>

          <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">联系我们</h2>
            <p className="text-slate-700 mb-2">
              如您对本协议有任何疑问，请通过以下方式联系我们：
            </p>
            <ul className="text-slate-700 space-y-1">
              <li>邮箱：support@yugioh.top</li>
              <li>电话：400-XXX-XXXX</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>本服务协议最后更新日期：2024年</p>
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
