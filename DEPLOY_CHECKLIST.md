# Deploy Checklist

## Current Status

- `npx next build --webpack` passes.
- `npx tsc -p tsconfig.json --noEmit` passes.
- Local production server runs on `http://127.0.0.1:5000`.
- Playwright smoke tests pass for frontend and admin main flows.
- Key admin buttons and safe interactions have been smoke tested.

## Verified Flows

- Frontend home page opens normally.
- Frontend login page opens normally.
- Local environment shows a clear WeChat login disabled message instead of a broken QR flow.
- Orders page opens and shows a login prompt when the user is not authenticated.
- Seller account publish page opens without admin-only API errors.
- Admin login works with `admin / admin123`.
- Admin dashboard, users, accounts, orders, withdrawals, verification requests, and WeChat verify file pages open normally.
- Admin refresh buttons, search inputs, detail dialogs, and safe modal open/close interactions work in smoke tests.

## Environment Variables

Required for current runtime:

- `PGDATABASE_URL`
- `WECHAT_MINIPROGRAM_APP_ID`
- `WECHAT_MINIPROGRAM_APP_SECRET`

Currently used in local config:

- `NEXT_PUBLIC_BASE_URL`
- `INTERNAL_API_URL`
- `WECHAT_APPID`
- `WECHAT_MCH_ID`
- `WECHAT_API_KEY`
- `WECHAT_NOTIFY_URL`
- `WECHAT_MP_APPID`
- `WECHAT_MP_SECRET`
- `WECHAT_MINIPROGRAM_APP_ID`
- `WECHAT_MINIPROGRAM_APP_SECRET`

Deployment recommendation:

- Move production secrets out of `.env.local` into the hosting platform secret manager.
- Keep `NEXT_PUBLIC_BASE_URL` aligned with the real deployed HTTPS domain.
- Keep `INTERNAL_API_URL` aligned with the deployed service URL if cron or internal callbacks depend on it.

## WeChat Login Notes

- Localhost is intentionally blocked for WeChat web login.
- Local login page now shows a clear disabled message instead of a failing QR login flow.
- To enable real WeChat login in deployment, you still need:
  - A public HTTPS domain
  - Correct WeChat callback domain configuration
  - Correct Open Platform `AppID` and `AppSecret`

## Deployment Risks Still Open

- ESLint still reports a large number of historical issues across `src/`.
- Most remaining issues are code quality issues, not current runtime blockers:
  - `@typescript-eslint/no-explicit-any`
  - `react/no-unescaped-entities`
  - Hook dependency warnings
  - A few `require()` style imports

## Recommended Pre-Deploy Steps

1. Run `npx next build --webpack`.
2. Run `npx tsc -p tsconfig.json --noEmit`.
3. Start with `npx next start --port 5000` or the deployment entrypoint script.
4. Run `node .\\scripts\\smoke-test.mjs`.
5. Verify the real deployed domain opens over HTTPS.
6. Verify admin login on the deployed environment.
7. Verify public homepage, login page, orders page, and seller publish page.
8. If WeChat login is intended for launch, verify callback configuration on the deployed domain.

## Manual Acceptance Checklist

- Open homepage and confirm branding, footer, and main navigation display correctly.
- Open `/login` and confirm the local/dev WeChat message or deployed WeChat behavior is correct.
- Log into admin and open:
  - `/admin`
  - `/admin/accounts`
  - `/admin/orders`
  - `/admin/users`
  - `/admin/verification-requests`
  - `/admin/withdrawals`
- Confirm search boxes respond normally on admin users and admin orders pages.
- Confirm order detail modal opens and closes correctly.
- Confirm verification review modal opens and closes correctly.
- Confirm withdrawal page and WeChat verify file page show correct empty or existing states.

## Nice-To-Have After Deployment

- Triage and reduce the existing ESLint backlog.
- Add a second smoke test profile for deployed HTTPS testing.
- Expand automated coverage to safe form validation and pagination edge cases.
