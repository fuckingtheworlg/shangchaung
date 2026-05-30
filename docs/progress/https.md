# https

启用 HTTPS（基于域名 `www.xiaoran11.top` + 腾讯云免费 DV 证书）。

## 已完成

- [x] `deploy/nginx.https.conf.template`：HTTPS server + 80→443 重定向 + 裸域 → www 301（2026-05-30）
- [x] `deploy/enable-https.sh`：一键切 HTTPS（校验证书匹配 / 备份旧配置 / 渲染新配置 / 改 .env / 重启 / 健康检查）（2026-05-30）
- [x] `deploy/install.sh`：检测到现有 HTTPS 配置时跳过 HTTP 模板覆盖（防止 install 重跑误降级到 HTTP）（2026-05-30）
- [ ] 服务器实际执行启用（用户操作中）

## 关键决策

- **主域名选 www.xiaoran11.top**：用户偏好；裸域 80 端口 301 跳 https://www，**不为裸域申请证书**。理由：免费 DV 是单域名，裸域走 301 不需要证书；规避"再申请一张"的成本。
- **不做证书自动续期**：腾讯云免费 DV 1 年有效期，到期前后会有邮件提醒；自动续期需要 acme.sh / certbot 与腾讯云 DNS API，对单机简单项目过重。到期时手动跑一次 `enable-https.sh` 即可。
- **HSTS 6 个月**：相对安全的默认值；如果担心证书续期失败被 HSTS 锁死，可手动调成 0 关闭。
- **HTTP/2 启用方式**：用 nginx 1.25+ 推荐的 `http2 on;` 指令而不是 `listen 443 ssl http2;`（避免 deprecation 警告）。
- **不覆盖逻辑**：install.sh 重跑时检测 `ssl_certificate` 关键字判断是否已 HTTPS，相比"用 marker 文件"更直接、与人工编辑的配置兼容。

## 已知限制 / 待办

- [ ] 证书 1 年后到期需要手动续：登录腾讯云 SSL → 重新申请同域名 → 下载 → scp 覆盖 → `sudo bash deploy/enable-https.sh www.xiaoran11.top`
- [ ] 没做 OCSP stapling / SSL Labs A+ 调优（按 SSL Labs 配置可加 stapling、HPKP、CSP 等），客户场景不需要
- [ ] 没集成 Let's Encrypt / acme.sh 自动续期（腾讯云免费证书 1 年期，比 LE 90 天好管）
- [ ] 小程序合法域名白名单需用户在微信公众平台手动添加（API 没法自动）
- [ ] 切到 HTTPS 后，小程序 `miniprogram/config.js` 的 `baseURL` 需要手动从 IP 改为域名（敲定后会单独提一次代码）

## 踩坑记录

本次开发流程顺利，无踩坑。

## 操作清单（用户执行）

1. 腾讯云 SSL 控制台 → 申请免费证书 → 域名填 `www.xiaoran11.top` → DNS 自动验证 → 等签发 → 下载 Nginx 版
2. `scp` 证书到服务器 `/etc/nginx/certs/www.xiaoran11.top.crt|key`
3. `sudo bash /opt/shangchaun/deploy/enable-https.sh www.xiaoran11.top`
4. 腾讯云轻量【防火墙】放行 443 端口
5. 修改 `miniprogram/config.js` 的 `baseURL` 为 `https://www.xiaoran11.top`
6. 微信公众平台 → 开发管理 → 服务器域名：将 `https://www.xiaoran11.top` 加入 request / downloadFile 合法域名
7. 微信开发者工具取消"不校验合法域名"勾选，重新编译验证
