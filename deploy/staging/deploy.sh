#!/usr/bin/env bash
# ================================================================
#  Deploy staging Mentingo LMS (Cờ Vua Học Đường) lên Hetzner VPS.
#  Chạy TRÊN VPS, từ bất kỳ đâu — script tự về repo root.
#  Yêu cầu: đã cài Docker + docker compose plugin; đã tạo 2 file env:
#     deploy/staging/.env.staging.api
#     deploy/staging/.env.staging.ui
#
#  Cách dùng:
#     ./deploy/staging/deploy.sh build     # build 2 image (api + web)
#     ./deploy/staging/deploy.sh migrate   # chạy migrations
#     ./deploy/staging/deploy.sh seed       # seed dữ liệu staging (gồm chess + branding)
#     ./deploy/staging/deploy.sh up         # khởi động toàn bộ stack
#     ./deploy/staging/deploy.sh all        # build + up + migrate + seed (lần đầu)
#     ./deploy/staging/deploy.sh logs       # xem log app
#     ./deploy/staging/deploy.sh ps         # trạng thái service
# ================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

COMPOSE_FILE="deploy/staging/docker-compose.staging.yml"
ENV_API="deploy/staging/.env.staging.api"
ENV_UI="deploy/staging/.env.staging.ui"
DC="docker compose -f ${COMPOSE_FILE}"

require_env() {
  [ -f "${ENV_API}" ] || { echo "❌ Thiếu ${ENV_API} (copy từ .env.staging.api.example)"; exit 1; }
  [ -f "${ENV_UI}" ]  || { echo "❌ Thiếu ${ENV_UI} (copy từ .env.staging.ui.example)"; exit 1; }
}

# Export VITE_* để compose interpolate build-arg cho web image.
load_ui_env() {
  set -a
  # shellcheck disable=SC1090
  . "${ENV_UI}"
  set +a
}

cmd_build() {
  require_env
  load_ui_env
  echo "🔨 Building images (api + web)... VITE_API_URL=${VITE_API_URL:-<unset>}"
  ${DC} build
}

cmd_up() {
  require_env
  echo "🚀 Starting stack..."
  ${DC} up -d
  ${DC} ps
}

cmd_infra_up() {
  require_env
  echo "🧱 Bringing up db + redis + minio (chờ healthy)..."
  ${DC} up -d db redis minio create-minio-bucket
}

cmd_migrate() {
  require_env
  cmd_infra_up
  echo "🗃️  Running migrations..."
  ${DC} run --rm app migrate
}

cmd_seed() {
  require_env
  cmd_infra_up
  echo "🌱 Seeding staging data (courses + chess banks + branding)..."
  ${DC} run --rm app seed
}

cmd_logs() { ${DC} logs -f --tail=200 app; }
cmd_ps()   { ${DC} ps; }

cmd_all() {
  cmd_build
  cmd_up
  cmd_migrate
  cmd_seed
  echo ""
  echo "✅ Xong. Kiểm tra:"
  echo "   - https://<domain>/                     (frontend)"
  echo "   - https://<domain>/api/chess/engine/status  (API + engine builtin)"
  echo "   - Đăng nhập: admin+<subdomain>@example.com / password"
  echo "     (subdomain = phần đầu hostname của CORS_ORIGIN, vd 'staging')"
  echo "   - Bước tay: Settings → Branding → upload logo navy (xem README)."
}

case "${1:-all}" in
  build)   cmd_build ;;
  up)      cmd_up ;;
  migrate) cmd_migrate ;;
  seed)    cmd_seed ;;
  logs)    cmd_logs ;;
  ps)      cmd_ps ;;
  all)     cmd_all ;;
  *) echo "Usage: $0 [build|up|migrate|seed|logs|ps|all]"; exit 1 ;;
esac
