#!/usr/bin/env bash
# 部署/更新脚本，在服务器 /var/www/shangchaun 目录下执行：
#   bash deploy/deploy.sh
#
# 流程：
#   1. git pull
#   2. 后端：npm ci --production=false → prisma 迁移 → tsc 构建
#   3. 后台：npm ci → vite build
#   4. PM2 重启

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/5] git pull"
git pull --ff-only

echo "==> [2/5] build server"
cd "$ROOT_DIR/server"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

echo "==> [3/5] build admin"
cd "$ROOT_DIR/admin"
npm ci
npm run build

echo "==> [4/5] ensure logs dir"
mkdir -p "$ROOT_DIR/logs"

echo "==> [5/5] pm2 restart"
cd "$ROOT_DIR"
if pm2 describe shangchaun-server >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.js --update-env
else
  pm2 start deploy/ecosystem.config.js
fi
pm2 save

echo "==> done. nginx 已挂载 admin/dist 和 server/uploads，无需手动复制。"
