#!/usr/bin/env bash
#
# 用 acme.sh + DNSPod API 签发 Let's Encrypt 证书（含 www + 裸域 SAN）
# 自动安装到 /etc/nginx/certs/ 并配置自动续期（90 天证书，到期前 30 天 cron 自动续）
#
# 用法：
#   1. 第一次跑会生成 /root/.shangchaun-acme.env 模板，编辑填入 DNSPod ID/Token
#   2. sudo bash deploy/issue-cert.sh
#
# 续期：无需手动，acme.sh 已注册系统 cron 每天检查。
# 手动重签：再跑一次本脚本即可（幂等）。
#
set -euo pipefail

APP_NAME="shangchaun"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
DOMAIN_WWW="${DOMAIN_WWW:-www.xiaoran11.top}"
DOMAIN_NAKED="${DOMAIN_NAKED:-xiaoran11.top}"
ACME_EMAIL="${ACME_EMAIL:-admin@${DOMAIN_NAKED}}"
ENV_FILE="${ENV_FILE:-/root/.shangchaun-acme.env}"
ACME_HOME="/root/.acme.sh"

log()  { echo -e "\033[1;32m[cert $(date +%H:%M:%S)]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn $(date +%H:%M:%S)]\033[0m $*"; }
err()  { echo -e "\033[1;31m[err  $(date +%H:%M:%S)]\033[0m $*" >&2; }

[[ $EUID -ne 0 ]] && { err "请用 sudo 运行"; exit 1; }

# ====== 1. token 配置文件 ======
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
# DNSPod API Token（从 https://console.dnspod.cn/account/token/token 获取）
# 编辑后保存即可，文件已 chmod 600
DP_Id=""
DP_Key=""
EOF
  chmod 600 "$ENV_FILE"
  err "首次运行：请编辑 ${ENV_FILE} 填入 DNSPod ID / Token，再重新执行本脚本"
  err "  vim ${ENV_FILE}"
  exit 1
fi
chmod 600 "$ENV_FILE"

# shellcheck disable=SC1090
source "$ENV_FILE"
if [[ -z "${DP_Id:-}" || -z "${DP_Key:-}" ]]; then
  err "${ENV_FILE} 中的 DP_Id 或 DP_Key 为空，请检查"
  exit 1
fi
export DP_Id DP_Key

# ====== 2. 装 acme.sh ======
if [[ ! -x "${ACME_HOME}/acme.sh" ]]; then
  log "安装 acme.sh（注册邮箱：${ACME_EMAIL}）"
  if ! curl -fsSL --connect-timeout 15 --max-time 120 https://get.acme.sh | sh -s email="${ACME_EMAIL}"; then
    err "acme.sh 安装失败，可能是网络问题。尝试用 GitHub 镜像："
    err "  curl https://ghfast.top/https://raw.githubusercontent.com/acmesh-official/acme.sh/master/acme.sh | sh -s email=${ACME_EMAIL}"
    exit 1
  fi
else
  log "acme.sh 已存在：$(${ACME_HOME}/acme.sh --version 2>&1 | head -1)"
fi
export PATH="${ACME_HOME}:$PATH"

# ====== 3. 默认 CA = Let's Encrypt（4.x 版本默认是 ZeroSSL，需要邮箱注册账号） ======
log "设置默认 CA 为 Let's Encrypt"
"${ACME_HOME}/acme.sh" --set-default-ca --server letsencrypt >/dev/null

# ====== 4. 签发证书（多域名 SAN：www + 裸域） ======
log "通过 DNSPod API 签发证书：${DOMAIN_WWW} + ${DOMAIN_NAKED}"
log "（首次签发需 1-3 分钟等待 DNS TXT 记录生效）"

ISSUE_RC=0
"${ACME_HOME}/acme.sh" --issue --dns dns_dp \
  -d "${DOMAIN_WWW}" -d "${DOMAIN_NAKED}" \
  --keylength 2048 || ISSUE_RC=$?

# acme.sh 在"证书未到期、未变化"时退出码 2，是正常情况
if [[ $ISSUE_RC -ne 0 && $ISSUE_RC -ne 2 ]]; then
  err "证书签发失败（exit=$ISSUE_RC）"
  err "查日志：cat ${ACME_HOME}/${DOMAIN_WWW}/${DOMAIN_WWW}.log"
  exit 1
fi
if [[ $ISSUE_RC -eq 2 ]]; then
  log "证书未变化，跳过重新签发"
fi

# ====== 5. 安装证书到 nginx 目录 ======
mkdir -p /etc/nginx/certs
log "安装证书到 /etc/nginx/certs/"
"${ACME_HOME}/acme.sh" --install-cert -d "${DOMAIN_WWW}" \
  --key-file       "/etc/nginx/certs/${DOMAIN_WWW}.key" \
  --fullchain-file "/etc/nginx/certs/${DOMAIN_WWW}.crt" \
  --reloadcmd      "systemctl reload nginx 2>/dev/null || true"

chmod 600 "/etc/nginx/certs/${DOMAIN_WWW}.key"

# ====== 6. 启用 acme.sh 自动升级（cron 已在安装时注册）======
"${ACME_HOME}/acme.sh" --upgrade --auto-upgrade >/dev/null 2>&1 || true

# ====== 7. 验证 ======
EXPIRY="$(openssl x509 -in "/etc/nginx/certs/${DOMAIN_WWW}.crt" -noout -enddate 2>/dev/null | cut -d= -f2)"
SUBJECT="$(openssl x509 -in "/etc/nginx/certs/${DOMAIN_WWW}.crt" -noout -subject 2>/dev/null)"

cat <<EOF

==================================================
🎉 证书已签发并安装
==================================================

  ${SUBJECT}
  到期时间：${EXPIRY}
  覆盖域名：${DOMAIN_WWW}, ${DOMAIN_NAKED}

  证书:    /etc/nginx/certs/${DOMAIN_WWW}.crt
  私钥:    /etc/nginx/certs/${DOMAIN_WWW}.key
  日志:    ${ACME_HOME}/${DOMAIN_WWW}/${DOMAIN_WWW}.log

  自动续期：已通过 acme.sh cron 启用
    crontab -l | grep acme.sh   # 看一眼应有"acme.sh --cron"那行
    续期窗口：到期前 30 天自动续，--reloadcmd 已配为 systemctl reload nginx

  下一步（启用 HTTPS Nginx 配置）：
    sudo bash ${APP_DIR}/deploy/enable-https.sh ${DOMAIN_WWW}

==================================================
EOF
