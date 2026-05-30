# https

启用 HTTPS（基于域名 `www.xiaoran11.top` + Let's Encrypt 证书 via acme.sh + DNSPod API）。

## 已完成

- [x] `deploy/nginx.https.conf.template`：HTTPS server，裸域 + www 都走 HTTPS（同一 SAN 证书），裸域 301 跳 www（2026-05-30）
- [x] `deploy/enable-https.sh`：一键切 HTTPS（校验证书匹配 / 备份旧配置 / 渲染新配置 / 改 .env / 重启 / 健康检查）（2026-05-30）
- [x] `deploy/install.sh`：检测到现有 HTTPS 配置时跳过 HTTP 模板覆盖（防止 install 重跑误降级到 HTTP）（2026-05-30）
- [x] `deploy/issue-cert.sh`：acme.sh + DNSPod API 一键签发 + 安装 + cron 自动续期（2026-05-30）
- [ ] 服务器实际执行启用（用户操作中）

## 关键决策

- **证书签发方式选 acme.sh + DNSPod API**（而不是腾讯云控制台手动申请）：用户偏好命令行；acme.sh 内置 cron 自动续期，1 行命令搞定，远比每年手动重申一次稳。
- **证书 CA 用 Let's Encrypt**：acme.sh 4.x 默认是 ZeroSSL，需要邮箱注册；显式 `--set-default-ca --server letsencrypt` 避免每次签发被要求注册账号。
- **DNSPod token 存到 `/root/.shangchaun-acme.env`**（chmod 600）：而非直接写脚本或参数。理由：bash history 不会泄露、git 不会跟踪、易于轮换。
- **裸域和 www 都走 HTTPS**（之前的方案是裸域只 301 不上 HTTPS）：acme.sh 用 `-d www -d 裸域` 签 SAN 证书，一张证书包含两个域名，零额外成本。
- **HSTS 6 个月**：相对安全的默认值；如果担心证书续期失败被 HSTS 锁死，可手动调成 0 关闭。
- **HTTP/2 启用方式**：用 nginx 1.25+ 推荐的 `http2 on;` 指令而不是 `listen 443 ssl http2;`（避免 deprecation 警告）。
- **不覆盖逻辑**：install.sh 重跑时检测 `ssl_certificate` 关键字判断是否已 HTTPS，相比"用 marker 文件"更直接、与人工编辑的配置兼容。

## 已知限制 / 待办

- [ ] 没做 OCSP stapling / SSL Labs A+ 调优，客户场景不需要
- [ ] 小程序合法域名白名单需用户在微信公众平台手动添加（API 没法自动）
- [ ] 切到 HTTPS 后，小程序 `miniprogram/config.js` 的 `baseURL` 需要手动从 IP 改为域名（敲定后会单独提一次代码）
- [ ] acme.sh 安装走 get.acme.sh（CDN 通常通），失败 fallback 到 GitHub 原始地址未自动化，需手动按提示走镜像

## 踩坑记录

本次开发流程顺利，无踩坑。

## 操作清单（用户执行）

1. DNSPod 控制台 https://console.dnspod.cn/account/token/token 创建 API Token，记下 ID + Token
2. 服务器：编辑 `/root/.shangchaun-acme.env` 填入 token（首次跑 issue-cert.sh 会自动生成模板）
3. `sudo bash /opt/shangchaun/deploy/issue-cert.sh` —— 签证书（1-3 分钟）
4. `sudo bash /opt/shangchaun/deploy/enable-https.sh www.xiaoran11.top` —— 启用 HTTPS Nginx
5. 腾讯云轻量【防火墙】放行 443 端口
6. 修改 `miniprogram/config.js` 的 `baseURL` 为 `https://www.xiaoran11.top`
7. 微信公众平台 → 开发管理 → 服务器域名：将 `https://www.xiaoran11.top` 加入 request / downloadFile 合法域名
8. 微信开发者工具取消"不校验合法域名"勾选，重新编译验证
