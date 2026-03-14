# V2 Rebuild Plan

## Goal

Build a clean replacement path beside the legacy project, instead of continuing to patch the old mixed flows.

## Phase 1

Only ship a stable login closed loop:

- PC browser login: WeChat Open Platform QR login
- WeChat browser login: Official Account OAuth login
- Shared callback writes user record and initializes wallet row
- New login page lives at `/v2/login`

## V2 Routes

- `/v2/login`
- `/api/v2/auth/wechat/config`
- `/api/v2/auth/wechat/authorize`
- `/api/v2/auth/wechat/callback`

## Design Rules

- Do not reuse old login dialogs or old callback state helpers.
- Do not let payment or withdrawal logic leak into phase 1.
- Validate env configuration directly in the new chain.
- Keep logs explicit and searchable.

## Phase 2

After phase 1 login is verified online, build payment as a separate clean layer:

- WeChat browser: JSAPI
- PC browser: Native
- H5 remains disabled until business approval is complete

## Phase 3

Then add withdrawal review:

- user request
- freeze balance
- admin review
- approve creates WeChat transfer
- reject unfreezes balance

## Current Marker

The first V2 bootstrap response returns:

- `buildMarker: v2-login-bootstrap-001`

Use that marker to verify cloud deployment is really serving the new V2 code.
