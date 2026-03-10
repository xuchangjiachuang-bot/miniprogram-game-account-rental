#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

cd "${COZE_WORKSPACE_PATH}"

load_env_file() {
  local file="$1"
  if [ -f "${file}" ]; then
    echo "Loading ${file}"
    set -a
    # shellcheck disable=SC1090
    . "${file}"
    set +a
    return 0
  fi
  return 1
}

set_default_env() {
  local var_name="$1"
  local default_value="$2"
  if [ -z "${!var_name:-}" ]; then
    export "${var_name}=${default_value}"
  fi
}

echo "Loading environment variables..."
load_env_file ".env.production" || load_env_file ".env.local" || load_env_file ".env" || true

set_default_env "WECHAT_MINIPROGRAM_APP_ID" "wx2382e1949d031ba6"
set_default_env "WECHAT_MINIPROGRAM_APP_SECRET" "f00d1a872e63be6e72b7ccc63eaa8a2d"
set_default_env "NEXT_PUBLIC_BASE_URL" "http://127.0.0.1:${DEPLOY_RUN_PORT}"
set_default_env "PGDATABASE_URL" "postgresql://user_7602973286103941146:6d1a5e86-6de8-4164-a92d-73b867d5e94a@cp-sharp-tower-5511e9e0.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770207199429?sslmode=require&channel_binding=require"
set_default_env "INTERNAL_API_URL" "http://localhost:5000"
set_default_env "NODE_ENV" "production"

echo "Validating required environment variables..."
for required_var in WECHAT_MINIPROGRAM_APP_ID WECHAT_MINIPROGRAM_APP_SECRET PGDATABASE_URL; do
  if [ -z "${!required_var:-}" ]; then
    echo "Missing required environment variable: ${required_var}"
    exit 1
  fi
done

echo "Starting Next.js on port ${DEPLOY_RUN_PORT}..."
npx next start --port "${DEPLOY_RUN_PORT}" 2>&1 | awk '
  /用户数据已同步到数据库/ { next }
  /用户余额记录已创建/ { next }
  /SECURITY WARNING: The SSL modes/ { next }
  /In the next major version/ { next }
  /To prepare for this change:/ { next }
  /If you want the current behavior/ { next }
  /If you want libpq compatibility now/ { next }
  /See https:\/\/www.postgresql.org\/docs\/current\/libpq-ssl.html/ { next }
  /^\(Use `node --trace-warnings/ { next }
  /severity_local: '\''NOTICE'\''/ { next }
  /severity: '\''NOTICE'\''/ { next }
  /code: '\''42P07'\''/ { next }
  /already exists, skipping/ { next }
  /\[initAgreementsTable\]/ { next }
  /\[initAdminTable\]/ { next }
  /\[Database\]/ { next }
  { print }
'
