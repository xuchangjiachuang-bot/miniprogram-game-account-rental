# Project Handoff

## Purpose

This project is a `Next.js 16` web app with an admin backend and a WeChat mini program sidecar. The recent cleanup focused on one core goal:

- keep only one user login chain
- make user data and wallet data persist reliably
- remove old duplicated auth logic created during prior repair attempts

This file is the fastest entry point for any future thread taking over the project.

## Current Truth

- Web framework: `Next.js 16.1.1`
- Package manager: `pnpm` only
- Preferred runtime baseline: `Node 22`
- Main app entry: standard Next production server
- Latest important cleanup commit: `e2d07a0`

Key repo files:

- App scripts: [package.json](/Users/11257/Documents/Playground/package.json)
- Container baseline: [Dockerfile](/Users/11257/Documents/Playground/Dockerfile)
- Deploy checks: [DEPLOY_CHECKLIST.md](/Users/11257/Documents/Playground/DEPLOY_CHECKLIST.md)
- Login UI: [src/components/LoginPanel.tsx](/Users/11257/Documents/Playground/src/components/LoginPanel.tsx)
- Auth service: [src/lib/user-service.ts](/Users/11257/Documents/Playground/src/lib/user-service.ts)
- Wallet persistence: [src/lib/user-balance-service.ts](/Users/11257/Documents/Playground/src/lib/user-balance-service.ts)

## Login Architecture

There should be only one login chain now, split by client environment:

- PC browser: WeChat QR login
- WeChat browser: WeChat OAuth login

Do not reintroduce SMS login or parallel login systems for frontend users unless the product direction changes explicitly.

Current main login files:

- [src/components/LoginPanel.tsx](/Users/11257/Documents/Playground/src/components/LoginPanel.tsx)
- [src/components/LoginDialog.tsx](/Users/11257/Documents/Playground/src/components/LoginDialog.tsx)
- [src/components/WechatQrLogin.tsx](/Users/11257/Documents/Playground/src/components/WechatQrLogin.tsx)
- [src/lib/wechat-login-client.ts](/Users/11257/Documents/Playground/src/lib/wechat-login-client.ts)
- [src/app/api/auth/route.ts](/Users/11257/Documents/Playground/src/app/api/auth/route.ts)
- [src/app/api/auth/wechat/callback/route.ts](/Users/11257/Documents/Playground/src/app/api/auth/wechat/callback/route.ts)
- [src/app/api/auth/wechat/check-login/route.ts](/Users/11257/Documents/Playground/src/app/api/auth/wechat/check-login/route.ts)

Important behavior:

- `POST /api/auth` no longer supports SMS login for users
- if someone tries the old path, it should fail instead of silently using legacy logic
- local development intentionally does not provide a fake broken WeChat login flow

## Persistence Rules

After login, user info and wallet info must remain permanently available in admin and wallet APIs.

Current persistence approach:

- WeChat login creates or updates a real `users` record
- token generation is handled in [src/lib/user-service.ts](/Users/11257/Documents/Playground/src/lib/user-service.ts)
- wallet state is ensured through `ensureUserBalance(...)`

Files involved:

- [src/lib/user-service.ts](/Users/11257/Documents/Playground/src/lib/user-service.ts)
- [src/lib/user-balance-service.ts](/Users/11257/Documents/Playground/src/lib/user-balance-service.ts)
- [src/app/api/admin/users/route.ts](/Users/11257/Documents/Playground/src/app/api/admin/users/route.ts)
- [src/app/api/admin/users/[id]/route.ts](/Users/11257/Documents/Playground/src/app/api/admin/users/[id]/route.ts)
- [src/app/api/admin/wallet/adjust/route.ts](/Users/11257/Documents/Playground/src/app/api/admin/wallet/adjust/route.ts)
- [src/app/api/wallet/route.ts](/Users/11257/Documents/Playground/src/app/api/wallet/route.ts)

If a future thread touches auth or wallet logic, verify these two outcomes:

- a first-time WeChat login creates a durable user row
- admin user list and wallet pages can still read the persisted balance

## Code That Was Intentionally Removed

These old auth pieces were removed during cleanup and should stay removed unless there is a deliberate product decision:

- `src/app/api/auth/miniprogram/route.ts`
- `src/app/api/auth/wechat/route.ts`
- `src/components/WechatBindDialog.tsx`
- `src/lib/auth-server.ts`
- `src/lib/wechat-service.ts`

There is still SMS-related code in the repo for admin or notification usage, but it should not be treated as the user login path.

## Deployment Baseline

The project is designed to run as a normal Next.js service, not a custom Node server framework.

Expected production baseline:

- Node: ideally `22`
- Package manager: `pnpm`
- Build: `pnpm install --frozen-lockfile` then `pnpm exec next build --webpack`
- Start: `npx next start --port $PORT`

Evidence:

- [package.json](/Users/11257/Documents/Playground/package.json)
- [Dockerfile](/Users/11257/Documents/Playground/Dockerfile)
- [scripts/start.sh](/Users/11257/Documents/Playground/scripts/start.sh)

For WeChat Cloud Hosting:

- the project is compatible with custom deployment
- the safest choice is to deploy with the existing [Dockerfile](/Users/11257/Documents/Playground/Dockerfile)
- the platform must not switch package manager to `npm` or `yarn`

The WeChat Cloud Hosting `CLI key` is only a deployment credential. It does not prove the runtime is correct.

## WeChat Cloud Hosting Workflow

This project has already been deployed successfully through WeChat Cloud Hosting custom deployment. The practical workflow to reuse is:

1. Push the target commit to the Git remote.
2. Open the WeChat Cloud Hosting service console.
3. Refresh the service version list until the new Git source version appears.
4. Publish that version from the version list.
5. After publish completes, verify the deployed domain instead of assuming success from the publish status alone.

Known deployment reference from prior work:

- Commit: `e2d07a0`
- Message: `fix: unify wechat login flow and persist wallet state`

When checking the version list, use the Git commit and commit message as the source of truth. If the platform shows an older source version, do not start debugging runtime behavior yet. Refresh the list first and confirm the intended commit is actually published.

### Post-Deploy Verification

After each publish, do not immediately trust the platform status badge. Verify in this order:

1. Confirm the service version list shows the intended Git commit and message.
2. Confirm the published online version has switched to that target version.
3. Only then start external behavior testing.

Once the target version is confirmed, check these flows in order:

1. Open the homepage.
2. Open the login UI.
3. Test PC browser WeChat QR login.
4. Test WeChat browser OAuth login.
5. Log into admin and inspect the user list.
6. Check that wallet data is readable and persisted for the logged-in user.

If login behavior looks wrong, always distinguish between these two cases:

- old version still deployed
- latest version deployed but runtime or data is broken

### Version Confirmation Before Testing

Future threads should follow this rule:

- do not treat a browser error observed during deployment as the final result
- do not start deep bug analysis until the deployed version is confirmed to be the intended commit

When direct commit visibility is available in the cloud console, use that first.

When direct commit visibility is not enough, use external behavior checks as a secondary signal:

- whether `/login` behavior matches the newest expected flow
- whether old callback query parameters are still present
- whether known fixed errors still appear unchanged

This is only a fallback. The preferred source of truth is always the cloud version list and published revision.

### Recommended Improvement

The project should add a lightweight runtime version endpoint later, for example:

- `/api/version`

Suggested response fields:

- deployed commit sha
- build time
- environment name

With this in place, future verification can become:

1. publish target commit
2. request `/api/version`
3. confirm the deployed commit matches
4. start browser testing

Until that endpoint exists, always use the cloud version list plus external behavior checks together.

### CLI Key And Log Inspection

The WeChat Cloud Hosting `CLI key` should be treated as an access method for deployment and log inspection, not as proof of runtime compatibility.

Use it after deployment for log-based diagnosis:

1. Confirm the latest service version has been published.
2. Use the platform CLI with the configured key to inspect runtime logs for that published service revision.
3. Check build logs first:
   - actual package manager used
   - actual Node version
   - actual build command
4. Check runtime logs next:
   - app boot success
   - Next server port binding
   - WeChat callback errors
   - database schema errors
   - user lookup or wallet persistence errors

When sharing logs back into a later thread, the most useful pieces are:

- exact timestamp
- exact published version or revision
- exact request path
- first server-side stack trace
- whether the problem happened in PC browser or WeChat browser

### Proven Debug Pattern

The most reliable collaboration loop for this project is:

1. Publish a known commit.
2. Reproduce the issue on the deployed domain.
3. Pull runtime logs through the platform or CLI key flow.
4. Compare the logs against current code assumptions.
5. Patch code or schema.
6. Push a new commit.
7. Re-publish and retest.

This matters because several historical issues looked like "frontend login broken" but were actually one of these:

- old version still deployed
- database missing WeChat login columns such as `wechat_unionid`
- wrong package manager or runtime in cloud build
- redirect or callback path mismatch

### What To Send Back For Fast Diagnosis

If a future thread needs to help with cloud issues, the fastest useful bundle is:

- screenshot of the published version list showing the active Git commit
- build log snippet
- runtime log snippet
- exact failing page URL
- whether it fails in PC browser or WeChat browser
- whether admin user list and wallet page still load

## Known Risks

These are the main issues still worth remembering:

- ESLint still has historical backlog across `src/`
- some old docs in the repo are stale or partially contradictory
- runtime issues previously observed were more related to database schema or deploy settings than to Next runtime incompatibility

One concrete log-backed risk:

- some environments showed database schema drift such as missing `wechat_unionid`, which can break admin queries even when the app boots successfully

Relevant logs:

- [runtime.out.log](/Users/11257/Documents/Playground/runtime.out.log)
- [runtime.err.log](/Users/11257/Documents/Playground/runtime.err.log)

## Fast Start Checklist

When a future thread picks this up, the fastest safe sequence is:

1. Read this file.
2. Read [DEPLOY_CHECKLIST.md](/Users/11257/Documents/Playground/DEPLOY_CHECKLIST.md).
3. Confirm auth still follows the single WeChat chain in [src/components/LoginPanel.tsx](/Users/11257/Documents/Playground/src/components/LoginPanel.tsx).
4. Confirm user creation and token flow in [src/lib/user-service.ts](/Users/11257/Documents/Playground/src/lib/user-service.ts).
5. Run `corepack pnpm ts-check`.
6. Run `node_modules\\.bin\\next.cmd build`.
7. If debugging deployment, compare the platform's real Node version, package manager, build command, start command, and port injection against this repo's expected baseline.

## What Not To Do

- Do not add a second frontend login system casually.
- Do not assume old auth files are still authoritative.
- Do not judge cloud runtime compatibility from a screenshot of `CLI key`.
- Do not use `npm install` in this project.
- Do not treat a successful app boot as proof that the database schema is fully compatible.

## Suggested Next Maintenance

- keep pruning stale docs if they conflict with the current login architecture
- add a migration or schema verification step for WeChat-related user columns if deployment environments still drift
- keep admin user and wallet smoke tests in the pre-deploy flow
