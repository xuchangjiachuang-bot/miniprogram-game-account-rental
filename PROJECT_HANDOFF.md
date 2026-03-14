# Project Handoff

## Purpose

This project is a `Next.js 16` web app with an admin backend. The current cleanup direction is strict:

- one frontend login chain
- one payment routing strategy
- one withdrawal review chain
- persistent user and wallet data only through real database records

Do not continue patching historical parallel flows. Rebuild or remove them.

## Current Runtime

- Framework: `Next.js 16.1.1`
- Package manager: `pnpm`
- Preferred Node baseline: `22`
- Deployment target used in practice: WeChat Cloud Hosting custom deployment

Key files:

- [package.json](C:/Users/11257/Documents/Playground/package.json)
- [Dockerfile](C:/Users/11257/Documents/Playground/Dockerfile)
- [PROJECT_HANDOFF.md](C:/Users/11257/Documents/Playground/PROJECT_HANDOFF.md)
- [README.md](C:/Users/11257/Documents/Playground/README.md)

## Single Login Chain

Frontend login is environment-based, but still one logical chain:

- PC browser: WeChat Open Platform QR login
- WeChat browser: WeChat Official Account OAuth login

Everything lands in the same callback:

- [src/app/api/auth/wechat/callback/route.ts](C:/Users/11257/Documents/Playground/src/app/api/auth/wechat/callback/route.ts)

Shared login state helpers:

- [src/lib/wechat/login-shared.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/login-shared.ts)
- [src/lib/wechat/login-flow.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/login-flow.ts)

Frontend login entry:

- [src/components/LoginPanel.tsx](C:/Users/11257/Documents/Playground/src/components/LoginPanel.tsx)
- [src/lib/wechat-login-client.ts](C:/Users/11257/Documents/Playground/src/lib/wechat-login-client.ts)

Persistence:

- [src/lib/user-service.ts](C:/Users/11257/Documents/Playground/src/lib/user-service.ts)
- [src/lib/user-balance-service.ts](C:/Users/11257/Documents/Playground/src/lib/user-balance-service.ts)

Rules:

- do not reintroduce SMS login for normal users
- do not reintroduce QR polling or temporary login-store logic
- do not let client code import server-side WeChat config readers

## Single Payment Strategy

Payment is not one transport for every device. It is one routing strategy:

- WeChat browser: `JSAPI`
- PC browser: `Native`
- external mobile browser: route to isolated `H5` holding page for now

Payment entry router:

- [src/lib/wechat/payment-entry.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/payment-entry.ts)

This file is the source of truth for web payment routing. Any new order or recharge payment jump should go through it.

Current payment pages:

- [src/app/(dynamic)/payment/wechat/jsapi/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/payment/wechat/jsapi/page.tsx)
- [src/app/(dynamic)/payment/wechat/native/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/payment/wechat/native/page.tsx)
- [src/app/(dynamic)/payment/wechat/h5/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/payment/wechat/h5/page.tsx)
- [src/components/wechat-payment/external-payment-page.tsx](C:/Users/11257/Documents/Playground/src/components/wechat-payment/external-payment-page.tsx)

Unified payment service layer:

- [src/lib/wechat/payment-service.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/payment-service.ts)
- [src/lib/wechat/payment-request.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/payment-request.ts)
- [src/lib/wechat/payment-flow.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/payment-flow.ts)
- [src/lib/wechat/v3.ts](C:/Users/11257/Documents/Playground/src/lib/wechat/v3.ts)

Current create routes already being unified:

- [src/app/api/payment/wechat/jsapi/create/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/jsapi/create/route.ts)
- [src/app/api/payment/wechat/jsapi/recharge/create/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/jsapi/recharge/create/route.ts)
- [src/app/api/payment/wechat/native/create/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/native/create/route.ts)
- [src/app/api/payment/wechat/native/recharge/create/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/native/recharge/create/route.ts)

Shared callback:

- [src/app/api/payment/wechat/jsapi/callback/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/jsapi/callback/route.ts)

H5, Native, Mini Program callbacks currently reuse the same callback implementation. Keep that unless there is a protocol-specific reason to split.

Important current business constraint:

- `H5` payment business type is not approved yet
- do not treat `/payment/wechat/h5` as a real payable flow
- the current H5 page is intentionally an isolation page that tells the user to use WeChat `JSAPI` or PC `Native`
- if H5 is enabled again in the future, rebuild it cleanly instead of reviving historical patch code

## Order And Recharge Linkage

Payment rebuild must always consider these linked flows together:

Order payment:

- create order: [src/app/api/orders/route.ts](C:/Users/11257/Documents/Playground/src/app/api/orders/route.ts)
- order detail page: [src/app/(dynamic)/orders/[id]/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/orders/[id]/page.tsx)
- payment creation: `jsapi/native/h5 create` routes
- callback settlement: `markWechatOrderPaid(...)`

Wallet recharge:

- user center entry: [src/app/(dynamic)/user-center/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/user-center/page.tsx)
- recharge query: [src/app/api/payment/recharge/[id]/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/recharge/[id]/route.ts)
- payment creation: `jsapi/native/h5 recharge create` routes
- callback settlement: `markWechatWalletRechargePaid(...)`

If rebuilding one side, verify the other side still works. They share payment records, settlement, and callback semantics.

## Single Withdrawal Review Chain

Withdrawal should now be treated as one chain:

1. user requests withdrawal
2. balance is frozen
3. admin reviews
4. approved: WeChat transfer bill is created
5. rejected: frozen balance is released back

User request:

- [src/app/api/withdrawals/route.ts](C:/Users/11257/Documents/Playground/src/app/api/withdrawals/route.ts)

Admin review:

- [src/app/admin/withdrawals/page.tsx](C:/Users/11257/Documents/Playground/src/app/admin/withdrawals/page.tsx)
- [src/app/api/admin/withdrawals/route.ts](C:/Users/11257/Documents/Playground/src/app/api/admin/withdrawals/route.ts)
- [src/app/api/admin/withdrawals/[id]/route.ts](C:/Users/11257/Documents/Playground/src/app/api/admin/withdrawals/[id]/route.ts)
- [src/lib/withdrawal-service.ts](C:/Users/11257/Documents/Playground/src/lib/withdrawal-service.ts)

Legacy user withdrawal detail route:

- [src/app/api/withdrawals/[id]/route.ts](C:/Users/11257/Documents/Playground/src/app/api/withdrawals/[id]/route.ts)

This route was cleaned so it no longer contains fake in-memory audit logic. Do not reintroduce simulated approval state there.

## Known High-Value Checks

### Login

After deploy:

1. PC login should jump to official WeChat QR login page.
2. WeChat browser login should complete OAuth and return with a persistent user.
3. Admin user list should show the new user.
4. Wallet APIs should return a real balance row for that user.

### Payment

Correct expectations:

- PC recharge/payment: `Native`
- WeChat browser recharge/payment: `JSAPI`
- external mobile browser: isolated holding page, not a real payment success path yet

If WeChat browser shows `chooseWXPay:permission denied`, check these first:

1. `WECHAT_PAY_APPID`
2. `WECHAT_MP_APPID`
3. whether those AppIDs are actually intended to match
4. JS interface security domain
5. JSAPI payment authorization directory
6. merchant binding to the official account AppID

Useful page:

- [src/app/(dynamic)/admin/payment/wechat/check/page.tsx](C:/Users/11257/Documents/Playground/src/app/(dynamic)/admin/payment/wechat/check/page.tsx)

Useful status API:

- [src/app/api/payment/wechat/config/route.ts](C:/Users/11257/Documents/Playground/src/app/api/payment/wechat/config/route.ts)

### Withdrawal

After login and wallet recharge:

1. create withdrawal request
2. verify freeze in wallet data
3. review in admin withdrawals page
4. verify approved path writes third-party transfer bill fields
5. verify rejected path returns frozen balance

## Deployment Workflow

The proven workflow is:

1. commit locally
2. push to `origin main`
3. wait for WeChat Cloud Hosting Git source version to appear
4. publish that version
5. verify the deployed domain
6. inspect logs if behavior is wrong

Do not start deep diagnosis until the cloud version really matches the intended commit.

## Verification Commands

Local checks used during cleanup:

```bash
corepack pnpm ts-check
cmd /c node_modules\\.bin\\next.cmd build
```

Reality note:

- `next build` is the more trustworthy signal in this repo right now
- `pnpm ts-check` may still be disturbed by generated `.next/types` validator artifacts

## Do Not Reintroduce

- old QR polling login flow
- in-memory withdrawal approval logic
- separate payment entry logic per page
- client imports of server-only WeChat config/db modules
- second user login system

## Current Cleanup Direction

The project is mid-refactor toward these durable boundaries:

- login state helpers separated into shared and server-only files
- payment creation routes unified behind one service layer
- payment entry unified by environment routing
- withdrawal review unified behind admin review service

If taking over in a new thread, continue simplifying toward fewer entry points and fewer duplicated route-level business rules.
