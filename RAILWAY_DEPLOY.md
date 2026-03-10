# Railway 测试部署说明

## 目标

把当前项目先部署到 Railway 的测试环境，用来做：

- 前后台联调
- 域名接入
- 微信支付测试
- 微信回调测试

推荐区域：

- `Singapore`

原因：

- 离中国相对更近
- 适合先做测试环境

## 先做的安全动作

你之前发过平台令牌，所以要先做这一步：

1. 去平台后台把旧令牌作废
2. 重新生成新令牌
3. 后续不要再把完整令牌直接发在聊天里

## 第一步：准备 GitHub 仓库

Railway 最省事的方式是直接从 GitHub 导入仓库。

你需要：

1. 在 GitHub 新建一个空仓库
2. 仓库建议设为私有
3. 仓库创建后，拿到仓库地址

如果你本地还没绑远程仓库，命令会类似：

```bash
git remote add origin <你的 GitHub 仓库地址>
git branch -M main
git add .
git commit -m "prepare railway deploy"
git push -u origin main
```

注意：

- 推送前确认不要把 `.env.production`、`certs/`、证书文件推上去
- 当前 `.gitignore` 已经补了这些敏感项

## 第二步：在 Railway 创建项目

1. 登录 Railway
2. 点击 `New Project`
3. 选择 `Deploy from GitHub repo`
4. 选择你刚才的仓库
5. Region 选 `Singapore`

## 第三步：配置构建和启动

Railway 导入后，服务里设置：

- Build Command

```bash
pnpm install --frozen-lockfile && npx next build --webpack
```

- Start Command

```bash
npx next start --port $PORT
```

说明：

- 这里不建议直接用本地的 `scripts/start.sh`
- Railway 环境更适合直接用标准 Next.js 启动命令

## 第四步：配置环境变量

在 Railway 项目变量里填写这些值：

- `NODE_ENV=production`
- `PGDATABASE_URL=<你的数据库连接串>`
- `NEXT_PUBLIC_BASE_URL=https://hfb.yugioh.top`
- `INTERNAL_API_URL=https://hfb.yugioh.top`
- `WECHAT_APPID=<你的微信支付 AppID>`
- `WECHAT_MCH_ID=1106605743`
- `WECHAT_API_KEY=<你的微信支付 API Key>`
- `WECHAT_NOTIFY_URL=https://hfb.yugioh.top/api/payment/wechat/jsapi/callback`
- `WECHAT_MP_APPID=<你的公众号 AppID>`
- `WECHAT_MP_SECRET=<你的公众号 AppSecret>`
- `WECHAT_CERT_PATH=/app/certs/wechat/apiclient_cert.pem`
- `WECHAT_KEY_PATH=/app/certs/wechat/apiclient_key.pem`
- `WECHAT_CERT_P12_PASSWORD=<证书密码>`

如果你要继续保留小程序：

- `WECHAT_MINIPROGRAM_APP_ID=<小程序 AppID>`
- `WECHAT_MINIPROGRAM_APP_SECRET=<小程序 AppSecret>`

## 第五步：处理证书

Railway 不适合像本地一样手工放 Windows 路径证书。

更稳的方式是：

1. 不把证书提交进 Git
2. 在 Railway 上用挂载卷或部署后上传到容器可读目录
3. 最终让服务端能读取：

```txt
/app/certs/wechat/apiclient_cert.pem
/app/certs/wechat/apiclient_key.pem
```

如果你暂时还没做这一步：

- 支付创建接口可以先测配置
- 退款这类依赖证书的链路先不要测

## 第六步：绑定域名

Railway 部署成功后：

1. 先拿到 Railway 分配的默认域名
2. 确认默认域名能打开站点
3. 再绑定自定义域名 `hfb.yugioh.top`
4. 去你的 DNS 平台按 Railway 提示配置解析

绑定完成后要确认：

- `https://hfb.yugioh.top` 能打开首页
- `https://hfb.yugioh.top/admin/login` 能打开后台
- SSL 正常

## 第七步：部署后检查

部署完成后，优先检查这些：

1. 首页能打开
2. 后台能登录
3. `/api/payment/wechat/config` 返回配置完整
4. 微信支付回调地址还是 `hfb.yugioh.top`
5. 数据库连接正常

## 第八步：再开始支付联调

通过上面检查后，再开始：

1. 小金额下单
2. 微信内拉起支付
3. 回调验收
4. 订单状态验收
5. 支付记录验收
6. 退款验收

## 当前最适合你的做法

你现在先完成这两件事：

1. 建一个 GitHub 私有仓库并把代码推上去
2. 在 Railway 新建项目并导入仓库

做完后告诉我：

- GitHub 仓库是否已经创建
- Railway 项目是否已经导入

我再继续带你做下一步变量配置和域名接入。
