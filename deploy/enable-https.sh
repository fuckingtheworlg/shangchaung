#!/usr/bin/env bash
#
# 一键启用 HTTPS（前提：证书已上传到 /etc/nginx/certs/）
#
# 用法：
#   sudo bash deploy/enable-https.sh www.xiaoran11.top
#
# 默认证书路径：
#   /etc/nginx/certs/<DOMAIN>.crt
#   /etc/nginx/certs/<DOMAIN>.key
# 可用环境变量覆盖：CERT / KEY
#
set -euo pipefail

APP_NAME="shangchaun"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"

log()  { echo -e "\033[1;32m[https $(date +%H:%M:%S)]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn  $(date +%H:%M:%S)]\033[0m $*"; }
err()  { echo -e "\033[1;31m[err   $(date +%H:%M:%S)]\033[0m $*" >&2; }

[[ $EUID -ne 0 ]] && { err "请用 sudo 运行"; exit 1; }

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  err "用法：sudo bash $0 <主域名>，例如 www.xiaoran11.top"
  exit 1
fi

CERT="${CERT:-/etc/nginx/certs/${DOMAIN}.crt}"
KEY="${KEY:-/etc/nginx/certs/${DOMAIN}.key}"

log "1/7 检查证书文件"
for f in "$CERT" "$KEY"; do
  if [[ ! -s "$f" ]]; then
    err "证书文件不存在或为空: $f"
    err "请先在本机执行（域名 / 路径按实际改）："
    err "  scp -r ./www_xiaoran11_top_nginx/* root@1.117.64.57:/etc/nginx/certs/"
    err "  然后 mv /etc/nginx/certs/*.crt /etc/nginx/certs/${DOMAIN}.crt"
    err "       mv /etc/nginx/certs/*.key /etc/nginx/certs/${DOMAIN}.key"
    exit 1
  fi
done

log "2/7 校验证书与私钥配对"
CRT_MOD="$(openssl x509 -noout -modulus -in "$CERT" 2>/dev/null | openssl md5)"
KEY_MOD="$(openssl rsa  -noout -modulus -in "$KEY"  2>/dev/null | openssl md5)"
if [[ "$CRT_MOD" != "$KEY_MOD" ]]; then
  err ".crt 与 .key 不匹配，请重新下载证书"
  exit 1
fi
log "证书 OK: $(openssl x509 -noout -subject -in "$CERT")"

log "3/7 备份旧 nginx 配置"
TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/etc/nginx/conf.d/shangchaun.conf.bak.${TS}"
if [[ -f /etc/nginx/conf.d/shangchaun.conf ]]; then
  cp /etc/nginx/conf.d/shangchaun.conf "$BACKUP"
  log "已备份到 $BACKUP"
else
  warn "找不到旧配置，直接生成新配置"
fi

log "4/7 渲染 HTTPS nginx 配置"
# 推导裸域：把第一段 www. 去掉；如果不是 www 开头则等于 DOMAIN
DOMAIN_NAKED="${DOMAIN_NAKED:-${DOMAIN#www.}}"
sed -e "s|@@DOMAIN_NAKED@@|${DOMAIN_NAKED}|g" \
    -e "s|@@DOMAIN@@|${DOMAIN}|g" \
    -e "s|@@APP_DIR@@|${APP_DIR}|g" \
    -e "s|@@CERT@@|${CERT}|g" \
    -e "s|@@KEY@@|${KEY}|g" \
    "${APP_DIR}/deploy/nginx.https.conf.template" \
    > /etc/nginx/conf.d/shangchaun.conf

if ! nginx -t; then
  err "nginx -t 失败，恢复备份"
  [[ -f "$BACKUP" ]] && cp "$BACKUP" /etc/nginx/conf.d/shangchaun.conf
  exit 1
fi
systemctl reload nginx
log "nginx 已重载"

log "5/7 更新 server/.env 的 PUBLIC_BASE_URL"
ENV_FILE="${APP_DIR}/server/.env"
NEW_URL="https://${DOMAIN}"
if grep -q '^PUBLIC_BASE_URL=' "$ENV_FILE"; then
  sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=\"${NEW_URL}\"|" "$ENV_FILE"
else
  echo "PUBLIC_BASE_URL=\"${NEW_URL}\"" >> "$ENV_FILE"
fi
log "PUBLIC_BASE_URL=${NEW_URL}"

log "6/7 重启 shangchaun-server"
systemctl restart shangchaun-server
sleep 2
if ! systemctl is-active --quiet shangchaun-server; then
  err "重启失败，最近 30 行日志："
  journalctl -u shangchaun-server -n 30 --no-pager || true
  exit 1
fi

log "7/7 健康检查"
if curl -fsS "http://127.0.0.1:3000/health" >/dev/null; then
  log "✅ 后端 127.0.0.1:3000/health 通过"
else
  warn "后端 127.0.0.1 健康检查失败"
fi
if curl -fsS "https://${DOMAIN}/health" >/dev/null; then
  log "✅ https://${DOMAIN}/health 通过"
else
  warn "https://${DOMAIN}/health 失败（可能是 DNS 还没生效或腾讯云防火墙未放 443）"
fi

cat <<EOF

==================================================
🎉 HTTPS 启用完成
==================================================

  后台地址:    https://${DOMAIN}/admin/
  API 地址:    https://${DOMAIN}/api/
  健康检查:    https://${DOMAIN}/health
  PUBLIC_BASE_URL = ${NEW_URL}

  待你手动做：
  1. 腾讯云【轻量服务器 → 防火墙】放行 443 端口（HTTPS）
  2. 修改 miniprogram/config.js：
       baseURL: 'https://${DOMAIN}'
  3. 微信公众平台 → 开发管理 → 服务器域名，把这些都加进白名单：
       request 合法域名:      https://${DOMAIN}
       downloadFile 合法域名: https://${DOMAIN}
  4. 微信开发者工具 → 详情 → 本地设置 → 取消勾选"不校验合法域名"
  5. 提交小程序审核（如果之前没提交过）

  HTTPS 配置回滚：
    sudo cp ${BACKUP} /etc/nginx/conf.d/shangchaun.conf && sudo nginx -t && sudo systemctl reload nginx
    （上面 BACKUP 路径已自动记录）

==================================================
EOF
