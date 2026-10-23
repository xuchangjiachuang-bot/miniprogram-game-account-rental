# 项目工作说明
- 游戏账号租赁平台的源码开放版本：Next.js Web/后台、微信小程序、PostgreSQL。
- 开工先读 STATE.md；许可及范围决定见 DECISIONS.md。负责人当前指令优先。
- 当前维护只保留 AGENTS.md、STATE.md、DECISIONS.md；README 面向使用者。其余已有技术文档与交接记录包含历史部署信息，仅按需查证。
- Node.js 22、pnpm 9；检查用 pnpm exec tsc --noEmit、pnpm exec eslint，构建用 pnpm exec next build --webpack。
- 不使用历史域名、数据库、商户、上传密钥或客户数据做测试；只用自建本地数据库和合成数据。
- 不恢复 push 自动上传，不发起支付、退款、提现或小程序发布。
- 配置只进本地环境变量；不提交私钥、数据库连接凭据、真实账号数据和运行产物。
- 开源整理不等于生产验收；对外说明必须区分代码存在、静态检查与实际联调。
- 完成一项任务后更新 STATE.md，记录证据和下一步；不覆盖无关变更。
