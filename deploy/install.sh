#!/usr/bin/env bash
#
# shangchaun 一键部署脚本（适用于腾讯云 / 阿里云 OpenCloudOS / CentOS / RHEL / Debian / Ubuntu）
#
# 用法 A（推荐，方便排查）：
#   curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/fuckingtheworlg/shangchaung/main/deploy/install.sh -o install.sh
#   sudo bash install.sh
#
# 用法 B（极简一行）：
#   curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/fuckingtheworlg/shangchaung/main/deploy/install.sh | sudo bash
#
# 用法 C（已经手动 clone 到本地，从项目里跑）：
#   cd /path/to/shangchaun && sudo bash deploy/install.sh
#
# 可覆盖的环境变量：
#   GH_MIRROR_PREFIX   GitHub 镜像前缀，默认 https://ghfast.top/
#   NPM_MIRROR         npm 镜像，默认 https://registry.npmmirror.com
#   NODE_VERSION       Node 版本，默认 20.18.1
#   PUBLIC_IP          外网访问 IP，默认 1.117.64.57
#   APP_DIR            部署目录，默认 /opt/shangchaun
#
# 幂等：重复运行不会破坏已有数据库、已生效的 systemd 与 nginx 配置。
#
set -euo pipefail

# ====== 配置 ======
APP_NAME="shangchaun"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
REPO_URL="https://github.com/fuckingtheworlg/shangchaung.git"
GH_MIRROR_PREFIX="${GH_MIRROR_PREFIX:-https://ghfast.top/}"
NPM_MIRROR="${NPM_MIRROR:-https://registry.npmmirror.com}"
NODE_VERSION="${NODE_VERSION:-20.18.1}"
NODE_MIRROR="${NODE_MIRROR:-https://npmmirror.com/mirrors/node}"
SERVER_PORT="${SERVER_PORT:-3000}"
PUBLIC_IP="${PUBLIC_IP:-1.117.64.57}"

# ====== 日志 ======
log()  { echo -e "\033[1;32m[install $(date +%H:%M:%S)]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn    $(date +%H:%M:%S)]\033[0m $*"; }
err()  { echo -e "\033[1;31m[err     $(date +%H:%M:%S)]\033[0m $*" >&2; }

trap 'err "脚本第 $LINENO 行失败，已退出。可重新运行本脚本（幂等）。"' ERR

# ====== 安全：root + 切到根目录避免 rm -rf 自删脚下 ======
if [[ $EUID -ne 0 ]]; then
  err "请用 root 或 sudo 运行：sudo bash install.sh"
  exit 1
fi
cd /

# ====== 1/10 检测系统 ======
log "1/10 检测系统..."
. /etc/os-release
log "OS: ${PRETTY_NAME:-unknown}"

PKG=""
INSTALL_OPTS=""
if command -v dnf >/dev/null 2>&1; then
  PKG="dnf"
  INSTALL_OPTS="-y --setopt=install_weak_deps=False"
elif command -v yum >/dev/null 2>&1; then
  PKG="yum"
  INSTALL_OPTS="-y"
elif command -v apt-get >/dev/null 2>&1; then
  PKG="apt-get"
  INSTALL_OPTS="-y -o Acquire::http::Timeout=20 -o Acquire::http::ConnectTimeout=10"
else
  err "未识别的包管理器（仅支持 dnf/yum/apt-get）"
  exit 1
fi
log "包管理器: $PKG"

# ====== 2/10 基础工具 ======
log "2/10 安装基础工具（git / curl / tar / xz / ...）"
if [[ "$PKG" == "apt-get" ]]; then
  apt-get update $INSTALL_OPTS >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install $INSTALL_OPTS \
    git curl wget tar xz-utils ca-certificates openssl
else
  $PKG install $INSTALL_OPTS git curl wget tar xz ca-certificates openssl
fi
log "基础工具就绪"

# ====== 3/10 安装 Node ======
log "3/10 安装 Node v${NODE_VERSION}"
NEED_NODE="true"
if command -v node >/dev/null 2>&1; then
  CUR="$(node -v 2>/dev/null || echo none)"
  if [[ "$CUR" == "v${NODE_VERSION}" ]]; then
    log "Node 已是目标版本 ${CUR}，跳过"
    NEED_NODE="false"
  else
    log "当前 Node 版本 ${CUR}，将覆盖为 v${NODE_VERSION}"
  fi
fi

if [[ "$NEED_NODE" == "true" ]]; then
  NODE_TGZ="/tmp/node-v${NODE_VERSION}-linux-x64.tar.xz"
  NODE_URL="${NODE_MIRROR}/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  log "下载 ${NODE_URL}（约 25MB，最多 3 分钟）"
  if ! timeout 180 curl -fL --progress-bar -o "$NODE_TGZ" "$NODE_URL"; then
    err "Node 下载失败，请检查网络（或换 NODE_MIRROR 环境变量）"
    exit 1
  fi
  rm -rf "/opt/node-v${NODE_VERSION}"
  mkdir -p "/opt/node-v${NODE_VERSION}"
  tar -xJf "$NODE_TGZ" -C "/opt/node-v${NODE_VERSION}" --strip-components=1
  ln -sf "/opt/node-v${NODE_VERSION}/bin/node" /usr/local/bin/node
  ln -sf "/opt/node-v${NODE_VERSION}/bin/npm"  /usr/local/bin/npm
  ln -sf "/opt/node-v${NODE_VERSION}/bin/npx"  /usr/local/bin/npx
  log "Node 安装完成: $(node -v) / npm $(npm -v)"
fi

log "配置 npm 默认 registry: $NPM_MIRROR"
npm config set registry "$NPM_MIRROR" --global >/dev/null
npm config set fund false --global >/dev/null
npm config set audit false --global >/dev/null

# ====== 4/10 安装 Docker（用于 MySQL）======
log "4/10 安装 Docker"
if command -v docker >/dev/null 2>&1 && docker --version >/dev/null 2>&1; then
  log "docker 已存在: $(docker --version)"
else
  if [[ "$PKG" == "apt-get" ]]; then
    install -m 0755 -d /etc/apt/keyrings
    if ! timeout 60 curl -fsSL --connect-timeout 15 \
        https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu/gpg \
        | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg; then
      err "Docker GPG key 下载失败"
      exit 1
    fi
    chmod a+r /etc/apt/keyrings/docker.gpg
    UB_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}")"
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu ${UB_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update $INSTALL_OPTS >/dev/null
    apt-get install $INSTALL_OPTS docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    # CentOS / RHEL / OpenCloudOS：用腾讯云镜像源
    log "添加 docker-ce 仓库（腾讯云镜像）"
    cat > /etc/yum.repos.d/docker-ce.repo <<'REPO'
[docker-ce-stable]
name=Docker CE Stable - $basearch
baseurl=https://mirrors.cloud.tencent.com/docker-ce/linux/centos/$releasever/$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://mirrors.cloud.tencent.com/docker-ce/linux/centos/gpg
REPO
    # OpenCloudOS 的 $releasever 可能不被识别，强制成 9 试试
    if ! $PKG install $INSTALL_OPTS docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null; then
      warn "默认 \$releasever 不通，尝试强制 release=9"
      sed -i 's|\$releasever|9|g' /etc/yum.repos.d/docker-ce.repo
      $PKG install $INSTALL_OPTS docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
  fi
  systemctl enable --now docker
  log "Docker 安装完成"
fi

# ====== 5/10 安装 Nginx ======
log "5/10 安装 Nginx"
if ! command -v nginx >/dev/null 2>&1; then
  if [[ "$PKG" == "apt-get" ]]; then
    apt-get install $INSTALL_OPTS nginx
  else
    # CentOS / RHEL / OpenCloudOS 默认源里没 nginx，先尝试官方仓库；
    # 失败再尝试 EPEL。已存在仓库则跳过。
    if ! $PKG install $INSTALL_OPTS nginx 2>/dev/null; then
      warn "默认源没 nginx，添加 nginx 官方仓库（腾讯云镜像）"
      RHEL_VER="$(. /etc/os-release && echo "${VERSION_ID%%.*}")"
      [[ "$RHEL_VER" == "23" || -z "$RHEL_VER" ]] && RHEL_VER=9
      cat > /etc/yum.repos.d/nginx.repo <<REPO
[nginx-stable]
name=nginx stable repo
baseurl=https://mirrors.cloud.tencent.com/nginx/centos/${RHEL_VER}/x86_64/
gpgcheck=0
enabled=1
module_hotfixes=true
REPO
      $PKG install $INSTALL_OPTS nginx
    fi
  fi
fi
systemctl enable nginx >/dev/null 2>&1 || true
log "Nginx 就绪"

# ====== 6/10 拉取代码 ======
log "6/10 拉取代码到 ${APP_DIR}"
mkdir -p /opt
if [[ -d "${APP_DIR}/.git" ]]; then
  log "${APP_DIR} 已存在，执行 git fetch（60s 超时，失败自动切镜像）"
  cd "$APP_DIR"
  ORIGIN_URL="$(git remote get-url origin)"
  if ! timeout 60 git fetch origin --progress; then
    warn "GitHub 直连失败，切换 ${GH_MIRROR_PREFIX} 镜像"
    PURE_URL="${ORIGIN_URL#${GH_MIRROR_PREFIX}}"
    git remote set-url origin "${GH_MIRROR_PREFIX}${PURE_URL}"
    if ! timeout 180 git fetch origin --progress; then
      err "镜像也失败，请检查网络后重跑本脚本"
      git remote set-url origin "$ORIGIN_URL"
      exit 1
    fi
  fi
  git reset --hard origin/main
  cd /
else
  log "首次 clone：先试直连（60s 超时），失败自动切镜像"
  cd /opt
  if ! timeout 60 git clone --depth 1 "$REPO_URL" "$APP_NAME"; then
    warn "GitHub 直连失败，切换 ${GH_MIRROR_PREFIX} 镜像"
    rm -rf "$APP_NAME"
    if ! timeout 180 git clone --depth 1 "${GH_MIRROR_PREFIX}${REPO_URL}" "$APP_NAME"; then
      err "clone 失败，请检查网络或换 GH_MIRROR_PREFIX 后重跑"
      exit 1
    fi
  fi
  cd /
fi

# ====== 7/10 启动 MySQL（docker compose）======
log "7/10 启动 MySQL（首次拉镜像约 1-3 分钟）"
cd "${APP_DIR}/deploy"
mkdir -p mysql-data
docker compose up -d
log "等待 MySQL 健康（最多 90s）..."
HEALTHY="false"
for i in $(seq 1 45); do
  STATE="$(docker inspect --format '{{.State.Health.Status}}' shangchaun-mysql 2>/dev/null || echo starting)"
  if [[ "$STATE" == "healthy" ]]; then
    HEALTHY="true"
    log "MySQL 已就绪"
    break
  fi
  sleep 2
done
if [[ "$HEALTHY" != "true" ]]; then
  warn "MySQL 90s 内未健康，但脚本会继续；如失败请 docker logs shangchaun-mysql 查看"
fi
cd /

# ====== 8/10 后端：依赖 + 构建 + .env + 数据库 ======
log "8/10 后端：安装依赖、初始化 .env、构建、同步数据库"
cd "${APP_DIR}/server"

# .env（首次生成，已有则不动）
if [[ ! -f .env ]]; then
  cp .env.example .env
  JWT="$(openssl rand -hex 32)"
  # macOS sed 与 GNU sed 不同，这里假设 Linux GNU sed
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=\"${JWT}\"|" .env
  sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=\"http://${PUBLIC_IP}\"|" .env
  log "已生成 .env，JWT_SECRET 已随机化，PUBLIC_BASE_URL=http://${PUBLIC_IP}"
else
  log ".env 已存在，跳过初始化（如需重置请手动删除）"
fi

log "npm install（首次约 1-3 分钟，走镜像 ${NPM_MIRROR}）"
npm install --no-audit --no-fund --legacy-peer-deps --registry "$NPM_MIRROR"
log "prisma generate"
npx prisma generate >/dev/null
log "tsc 构建"
npm run build

log "Prisma 同步数据库 schema"
if [[ -d prisma/migrations ]] && [[ -n "$(ls -A prisma/migrations 2>/dev/null)" ]]; then
  npx prisma migrate deploy
else
  # 仓库无 migrations，首次部署用 db push 直接按 schema 建表
  npx prisma db push --skip-generate --accept-data-loss
fi
cd /

# ====== 9/10 后台：依赖 + 构建 ======
log "9/10 后台：安装依赖 + 构建（首次约 2-5 分钟）"
cd "${APP_DIR}/admin"
npm install --no-audit --no-fund --legacy-peer-deps --registry "$NPM_MIRROR"
npm run build
cd /

# ====== 10/10 systemd + Nginx + 启动 ======
log "10/10 写 systemd + Nginx 配置"

NODE_BIN="$(command -v node)"
log "node 二进制: ${NODE_BIN}"

# systemd unit
sed -e "s|@@NODE@@|${NODE_BIN}|g" \
    -e "s|@@APP_DIR@@|${APP_DIR}|g" \
    "${APP_DIR}/deploy/shangchaun-server.service.template" \
    > /etc/systemd/system/shangchaun-server.service

systemctl daemon-reload
systemctl enable shangchaun-server >/dev/null
systemctl restart shangchaun-server
sleep 2
if ! systemctl is-active --quiet shangchaun-server; then
  err "shangchaun-server 启动失败，最近 30 行日志："
  journalctl -u shangchaun-server -n 30 --no-pager || true
  exit 1
fi
log "shangchaun-server 已运行"

# Nginx
sed "s|@@APP_DIR@@|${APP_DIR}|g" \
  "${APP_DIR}/deploy/nginx.conf.template" \
  > /etc/nginx/conf.d/shangchaun.conf
# 关掉默认站点，避免和 default_server 冲突
for f in /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default; do
  if [[ -e "$f" ]] && [[ ! -e "${f}.disabled-by-shangchaun" ]]; then
    mv "$f" "${f}.disabled-by-shangchaun"
    log "已禁用 $f"
  fi
done
nginx -t
systemctl reload nginx 2>/dev/null || systemctl start nginx
log "Nginx 已重载"

# ====== 验证 ======
log "✅ 部署阶段完成，开始健康检查"
sleep 1
if curl -fsS "http://127.0.0.1:${SERVER_PORT}/health" >/dev/null; then
  log "✅ 后端 /health 直连通过"
else
  warn "后端 /health 直连失败，请看 journalctl -u shangchaun-server -n 50"
fi
if curl -fsS "http://127.0.0.1/health" >/dev/null; then
  log "✅ Nginx → 后端 /health 通过"
else
  warn "Nginx 转发异常，请看 /var/log/nginx/error.log"
fi

# ====== 完成提示 ======
cat <<EOF

==================================================
🎉 部署完成
==================================================

  后台地址:      http://${PUBLIC_IP}/admin/
  公开 API 示例: http://${PUBLIC_IP}/api/articles
  健康检查:      http://${PUBLIC_IP}/health

  管理员账号:    admin
  管理员密码:    admin123456
  ⚠️ 请尽快修改密码：
      vim ${APP_DIR}/server/.env        # 改 ADMIN_PASSWORD
      sudo systemctl restart shangchaun-server

  常用命令：
    实时日志：    journalctl -u shangchaun-server -f
    重启后端：    sudo systemctl restart shangchaun-server
    更新代码：    sudo bash ${APP_DIR}/deploy/update.sh
    MySQL 状态：  cd ${APP_DIR}/deploy && docker compose ps

  待办：
    1. 腾讯云【防火墙】放行 80/443 端口（22 应已放行）
    2. 微信开发者工具：详情 → 本地设置 → 勾"不校验合法域名"
    3. miniprogram/config.js 的 baseURL 改为 http://${PUBLIC_IP}
    4. 域名备案 + HTTPS 完成后参考 deploy/nginx.conf.template 末尾的注释段

==================================================
EOF
