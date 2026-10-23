# 游戏账号租赁平台 · Game Account Rental Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于 Next.js、React、PostgreSQL 和原生微信小程序的账号租赁平台源码。原作者已不再自用，于 2026-10-23 补充 MIT 许可证，开放给希望研究、修改或继续维护此类系统的开发者。

Source release of a game account rental platform with a Next.js web/admin app, a native WeChat mini program, and PostgreSQL. This is an existing project shared for reuse and further development, not a production-certified turnkey service.

## 包含什么

- Web 前台与运营后台，以及微信小程序源码。
- 账号展示、订单、用户与余额相关代码。
- 微信登录、支付、退款、提现、客服及存储的集成实现和历史脚本。
- Drizzle 数据结构、数据库迁移及开发辅助脚本。

上述功能以源码为准。本次整理没有重新完成支付、微信登录、小程序真机或完整订单流程联调；旧测试记录不代表当前版本已验收。

## 开始阅读与本地开发

需要 Node.js 22、pnpm 9 和你自己的 PostgreSQL 开发数据库。微信登录、支付、短信和云存储需要另外申请、配置相应服务。

```sh
git clone https://github.com/xuchangjiachuang-bot/miniprogram-game-account-rental.git
cd miniprogram-game-account-rental
corepack enable
pnpm install --frozen-lockfile
```

复制 `.env.example` 为 `.env.local`（PowerShell：`Copy-Item .env.example .env.local`），填写自己的数据库地址和配置。首次创建管理员时，`BOOTSTRAP_ADMIN_PASSWORD` 需要至少 16 个字符；不会再自动生成固定密码管理员。

数据结构入口为 `src/storage/database/shared/schema.ts`、`docs/database-schema.sql` 和 `migrations/`。历史迁移并非一套已在全新数据库重新验证的一键安装流程，请先在空的本地开发库检查结构及迁移顺序，不要直接对已有生产库运行。

```sh
# 直接启动 Next.js，避免旧脚本结束占用端口的其他进程
pnpm exec next dev --webpack --port 5000

# 静态检查与构建（需要配置开发环境）
pnpm run check:opensource
pnpm exec tsc --noEmit
pnpm exec eslint
pnpm exec next build --webpack
```

访问 `http://localhost:5000`。安装命令和入口已按现有源码整理，完整安装与端到端流程尚待重新验收。仓库中的老部署脚本保留作参考，不构成运行生产操作的建议。

## 微信小程序

用微信开发者工具导入 `miniprogram/`，替换为自己的 AppID，并检查 `miniprogram/utils/config.js`、`project.config.json` 及云环境配置。默认配置已切换到本地开发；历史源码中的其他服务绑定也需要逐项检查。

`miniprogram-source/` 和 `miniprogram/.tools/` 含早期副本及上传实验脚本，不是推荐发布入口。检出的内嵌私钥已清除，含 `CONFIGURE_LOCALLY` 的旧示例需要自行配置。提交到 GitHub 不会再自动上传微信。

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/app/` | Web 页面与 API |
| `src/lib/` | 业务与第三方服务集成 |
| `src/storage/database/` | 数据结构和数据库管理代码 |
| `miniprogram/` | 微信小程序 |
| `migrations/` | 历史数据库迁移 |
| `scripts/` | 开发与历史运维脚本 |
| `AGENTS.md` / `STATE.md` / `DECISIONS.md` | 当前维护规则、状态与决定 |

其他现有文档包含历史域名、部署过程和阶段结论，仅供查证，不是可直接复用的生产配置。

## 维护与贡献

欢迎通过 Issues 报告可复现的问题，通过 Pull Requests 提交修复、安装说明或测试。请使用合成数据，说明运行环境、复现步骤和实际验证结果；不要提交账号密码、订单个人信息、私钥或生产连接地址。原作者当前不承诺持续功能开发或商业支持。

本次已从当前文件移除扫描发现的内嵌私钥、部分凭据和远程数据库硬编码；Git 历史仍保留旧版本。历史凭据必须视为已暴露，由原持有人撤销或轮换。当前扫描通过也不代表完成全面安全审计，不应直接用于处理真实资金。

## 许可证

仓库作者拥有的原创代码及文档按 [MIT License](LICENSE) 提供，允许使用、修改、分发与商用，需保留版权及许可声明。依赖、第三方代码、图片、游戏标识及服务仍受各自许可或权利约束；本项目不授予这些第三方权利。`package.json` 的 `private: true` 仅用于防止误发 npm 包，不影响 GitHub 开源。
