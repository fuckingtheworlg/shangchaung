# https

启用 HTTPS（基于域名 `www.xiaoran11.top` + Let's Encrypt 证书 via acme.sh + DNSPod API）。

## 已完成

- [x] `deploy/nginx.https.conf.template`：HTTPS server，裸域 + www 都走 HTTPS（同一 SAN 证书），裸域 301 跳 www（2026-05-30）
- [x] `deploy/enable-https.sh`：一键切 HTTPS（校验证书匹配 / 备份旧配置 / 渲染新配置 / 改 .env / 重启 / 健康检查）（2026-05-30）
- [x] `deploy/install.sh`：检测到现有 HTTPS 配置时跳过 HTTP 模板覆盖（防止 install 重跑误降级到 HTTP）（2026-05-30）
- [x] `deploy/issue-cert.sh`：acme.sh + DNSPod API 一键签发 + 安装 + cron 自动续期（2026-05-30）
- [x] 服务器实际执行 HTTPS 启用（2026-05-30）：
  - 用 ghfast 镜像 git clone acme.sh 安装（原 get.acme.sh 重定向 raw.githubusercontent.com 国内不通）
  - 签发 Let's Encrypt SAN 证书（含 www + 裸域），到期 2026-08-28，cron 自动续期已启用
  - HTTPS Nginx 配置已切换，PUBLIC_BASE_URL 已改为 https://www.xiaoran11.top
  - 数据库 articles 表里旧 `http://1.117.64.57` 已批量替换为 `https://www.xiaoran11.top`（影响 2 个 cover + 1 个 content）
  - 外部验证：80 → 301 跳 https / 裸域 → 301 跳 www / API + Admin + Health 均 200
- [x] `miniprogram/config.js`：`baseURL` 改为 `https://www.xiaoran11.top`（2026-05-30）

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
- [ ] `issue-cert.sh` 待优化：acme.sh 安装路径自动 fallback 到 `git clone ghfast 镜像`；签发命令默认带 `--dnssleep 120`
- [ ] 数据库 URL 迁移没做成幂等脚本，目前是人工 SQL；如以后再换域名需复用，应封装成 `deploy/migrate-base-url.sh`

## 踩坑记录

- ⚠️ **现象**：`curl https://get.acme.sh | sh` 卡 8 分钟下载 0 字节
  **根因**：get.acme.sh 重定向到 `raw.githubusercontent.com`，国内访问极不稳定
  **修复**：手动 `git clone https://ghfast.top/https://github.com/acmesh-official/acme.sh.git` 后 `./acme.sh --install`；issue-cert.sh 后续应内置此 fallback（已记入待办）

- ⚠️ **现象**：第一次 acme.sh 签发失败：`NXDOMAIN looking up TXT for _acme-challenge.www.xiaoran11.top`
  **根因**：DNSPod 添加 TXT 记录后，全球 DNS 节点还没同步完，Let's Encrypt 的 secondary validation 用其他节点查询返回 NXDOMAIN
  **修复**：`acme.sh --issue ... --dnssleep 120` 等够 2 分钟再验证；issue-cert.sh 已记入待办添加默认参数

- ⚠️ **现象**：HTTPS 启用后，小程序拉取 articles 列表，cover 仍然是 `http://1.117.64.57/...` 的旧 URL
  **根因**：HTTPS 切换前已上传的图片，写入数据库时的 URL 用的是当时的 `PUBLIC_BASE_URL`（IP）；env 改了只影响**新上传**，旧数据需要单独迁移
  **修复**：`UPDATE articles SET cover = REPLACE(cover, 'http://1.117.64.57', 'https://www.xiaoran11.top') ...` 同样跑了 content 字段（含富文本里的 img src）

- ⚠️ **现象**：第一次部署时 SSH 自杀（exit 255）
  **根因**：`pkill -9 -f "get.acme.sh"` 的命令字符串本身被 ssh shell 传递时也包含 "get.acme.sh"，被自己的模式匹配杀掉
  **修复**：改用 `ps -ef | awk '/pattern/' | xargs kill` 显式过滤，避免模式自匹配

## 操作清单（用户执行）

1. DNSPod 控制台 https://console.dnspod.cn/account/token/token 创建 API Token，记下 ID + Token
2. 服务器：编辑 `/root/.shangchaun-acme.env` 填入 token（首次跑 issue-cert.sh 会自动生成模板）
3. `sudo bash /opt/shangchaun/deploy/issue-cert.sh` —— 签证书（1-3 分钟）
4. `sudo bash /opt/shangchaun/deploy/enable-https.sh www.xiaoran11.top` —— 启用 HTTPS Nginx
5. 腾讯云轻量【防火墙】放行 443 端口
6. 修改 `miniprogram/config.js` 的 `baseURL` 为 `https://www.xiaoran11.top`
7. 微信公众平台 → 开发管理 → 服务器域名：将 `https://www.xiaoran11.top` 加入 request / downloadFile 合法域名
8. 微信开发者工具取消"不校验合法域名"勾选，重新编译验证
