# WxCloud Env Safety

## Root cause

On March 18, 2026, the risky behavior was not "adding object storage vars" itself.
The real risk came later when Cloud托管 service config or deploy flows wrote back a full
`envParams` payload with only a partial subset of keys.

`wxcloud run:deploy` and `wxcloud service:config update` both write the whole service
env set, not a single key patch.

## Safe rule

Never submit only the new storage-related vars.

Always submit the complete env set for the service.

## Safer local workflow

1. Keep the canonical full env set in `.env.production`.
2. Run:

```bash
pnpm wxcloud:envjson > tmp/wxcloud-env.json
```

3. Use the generated full JSON as `--envParamsJson`.

## Relevant dates

- March 18, 2026 13:13 CST: storage env evolution started in repo (`c70d075`)
- March 18, 2026 15:06 CST: moved toward CloudBase env model (`5bc7150`)
- March 18, 2026 18:08-18:42 CST: highest-risk window for destructive service env overwrite
