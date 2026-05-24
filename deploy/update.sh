#!/usr/bin/env bash
#
# 日常更新脚本（在服务器上运行）
#   sudo bash /opt/shangchaun/deploy/update.sh
#
# 行为：
#   1. git fetch 60s 超时，失败自动切到 GitHub 镜像
#   2. 重装后端依赖 + 构建 + 同步数据库
#   3. 重装后台依赖 + 构建
#   4. 重启 systemd 服务
#
set -euo pipefail

APP_NAME="shangchaun"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
GH_MIRROR_PREFIX="${GH_MIRROR_PREFIX:-https://ghfast.top/}"
NPM_MIRROR="${NPM_MIRROR:-https://registry.npmmirror.com}"

log()  { echo -e "\033[1;32m[update $(date +%H:%M:%S)]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn   $(date +%H:%M:%S)]\033[0m $*"; }
err()  { echo -e "\033[1;31m[err    $(date +%H:%M:%S)]\033[0m $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "请用 root 或 sudo 运行"
  exit 1
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  err "${APP_DIR} 不是 git 仓库，请先运行 install.sh"
  exit 1
fi

cd "$APP_DIR"

# ====== 1/5 git fetch（带超时 + 镜像 fallback）======
log "1/5 git fetch（60s 超时，失败自动切镜像）"
ORIGIN_URL="$(git remote get-url origin)"
if ! timeout 60 git fetch origin --progress; then
  warn "GitHub 直连失败，切换 ${GH_MIRROR_PREFIX} 镜像"
  PURE_URL="${ORIGIN_URL#${GH_MIRROR_PREFIX}}"
  git remote set-url origin "${GH_MIRROR_PREFIX}${PURE_URL}"
  if ! timeout 180 git fetch origin --progress; then
    err "镜像也失败"
    git remote set-url origin "$ORIGIN_URL"
    exit 1
  fi
fi
git reset --hard origin/main

# ====== 2/5 后端 ======
log "2/5 后端依赖 + 构建"
cd "${APP_DIR}/server"
npm install --no-audit --no-fund --legacy-peer-deps --registry "$NPM_MIRROR"
npx prisma generate >/dev/null
npm run build

log "3/5 Prisma 同步"
if [[ -d prisma/migrations ]] && [[ -n "$(ls -A prisma/migrations 2>/dev/null)" ]]; then
  npx prisma migrate deploy
else
  npx prisma db push --skip-generate --accept-data-loss
fi

# ====== 4/5 后台 ======
log "4/5 后台依赖 + 构建"
cd "${APP_DIR}/admin"
npm install --no-audit --no-fund --legacy-peer-deps --registry "$NPM_MIRROR"
npm run build

# ====== 5/5 重启 ======
log "5/5 重启 shangchaun-server"
systemctl restart shangchaun-server
sleep 2
if ! systemctl is-active --quiet shangchaun-server; then
  err "重启后服务未运行，最近 30 行日志："
  journalctl -u shangchaun-server -n 30 --no-pager || true
  exit 1
fi

if curl -fsS "http://127.0.0.1:3000/health" >/dev/null; then
  log "✅ /health 通过，更新完成"
else
  warn "/health 失败，请人工排查"
fi
