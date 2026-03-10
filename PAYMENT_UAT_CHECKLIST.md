# 微信支付联调清单

## 当前结论

- 现在主链路已经统一到真实微信支付创建、回调、退款这一套后端实现。
- 当前“分账”是平台内部账务分摊，不是微信商户官方分账。
- 本地环境不能做真实微信支付联调，必须放到公网 HTTPS 测试域名。

## 代码里已经有的能力

- 支付创建
  - `/api/payment/wechat/jsapi/create`
  - `/api/payment/wechat/minip/create`
- 支付回调
  - `/api/payment/wechat/jsapi/callback`
  - `/api/payment/wechat/minip/callback`
- 退款
  - `/api/payment/wechat/refund`
  - `/api/payment/wechat/refund/callback`
- 后台支付配置
  - `/api/admin/payment/configs`
- 后台证书上传
  - `/api/admin/payment/cert-upload`

## 上测试域名前必须准备

你至少需要这些：

- 1 个公网 HTTPS 测试域名
- 1 套可用的测试环境数据库
- 1 套真实微信商户参数
- 商户 API 证书文件
- 能访问后台的管理员账号

## 必填支付配置

后台当前至少要填这 4 项：

- `appid`
- `mch_id`
- `api_key`
- `notify_url`

项目里还预留了这些常用项：

- `mp_appid`
- `mp_secret`
- `cert_path`
- `key_path`
- `cert_p12_password`
- `cert_serial_no`

相关代码：

- [configs route](/C:/Users/11257/Documents/Playground/src/app/api/admin/payment/configs/route.ts)
- [payment config](/C:/Users/11257/Documents/Playground/src/lib/payment/config.ts)

## 环境变量要对齐

部署测试环境时，至少确认这些值一致：

- `NEXT_PUBLIC_BASE_URL`
- `INTERNAL_API_URL`
- `WECHAT_APPID`
- `WECHAT_MCH_ID`
- `WECHAT_API_KEY`
- `WECHAT_NOTIFY_URL`
- `WECHAT_MP_APPID`
- `WECHAT_MP_SECRET`
- `WECHAT_CERT_PATH`
- `WECHAT_KEY_PATH`
- `WECHAT_CERT_P12_PATH`
- `WECHAT_CERT_P12_PASSWORD`

关键点：

- `NEXT_PUBLIC_BASE_URL` 必须是测试域名
- `notify_url` 必须回到测试域名，不要再指向旧生产域名

## 证书准备

后台上传接口目前支持这些文件：

- `apiclient_cert.pem`
- `apiclient_key.pem`
- `apiclient_cert.p12`

默认目录：

- `certs/wechat/`

注意：

- 目前上传接口对 `.pem` 更友好
- `.p12` 现在保存可以，但解析提示还不完整，不建议作为第一联调路径

相关代码：

- [cert upload](/C:/Users/11257/Documents/Playground/src/app/api/admin/payment/cert-upload/route.ts)

## 推荐联调顺序

1. 先把站点部署到测试域名。
2. 确认首页、登录页、admin 后台都能正常打开。
3. 在后台填好微信支付配置。
4. 上传商户证书。
5. 访问 `/api/payment/wechat/config`，确认配置完整。
6. 用小金额订单做一次真实支付。
7. 确认支付回调后订单变成 `paid`。
8. 确认 `payment_records` 有新增记录。
9. 在后台和订单页确认支付结果展示正常。
10. 再做一次退款联调。
11. 最后核对平台内部分账记录和余额变化。

## 第一轮重点验收

第一轮不要一上来追“全部都通”，优先确认这 5 件事：

- 用户能拉起微信支付
- 支付成功后回调能打到测试域名
- 订单状态能更新
- 支付记录能落库
- 退款申请能创建

## 分账说明

这套业务现在走的是平台内部账务分摊：

- 平台收用户支付
- 订单完成后，平台按业务规则计算佣金和卖家收入
- 分账结果记在站内余额和分账记录里

这不是微信官方分账接口，所以不会受你提到的那种官方分账比例限制。

## 现在还不建议直接测的内容

这些最好放到第二轮：

- 提现全链路
- 高并发回调幂等
- 异常退款重试
- 复杂优惠活动叠加下的分账校验

## 我们下一步最适合做什么

如果你准备继续按现在的节奏推进，最合适的是：

1. 你准备测试域名和商户参数
2. 我来帮你做一轮“测试环境支付配置检查”
3. 然后我们开始第一笔小金额真实支付联调
