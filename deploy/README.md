# 部署手册（腾讯云轻量 1.117.64.57）

> 一切交给 `install.sh`，3 步搞定。
> 操作系统：OpenCloudOS（基于 RHEL / dnf），脚本同时兼容 CentOS / RHEL / Debian / Ubuntu。

---

## 一、三步部署

### 1. 在腾讯云控制台 → 防火墙：放行 80 端口

（22 应该已经放行；443 等域名备案完成后再放）

### 2. SSH 登录服务器，执行一键安装

**推荐：先下载再跑（方便看脚本内容）**

```bash
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/fuckingtheworlg/shangchaung/main/deploy/install.sh -o install.sh
sudo bash install.sh
```

**极简：一行命令**

```bash
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/fuckingtheworlg/shangchaung/main/deploy/install.sh | sudo bash
```

脚本会自动完成：
- 检测系统、装基础工具（git/curl/tar/...）
- 装 Node v20（npmmirror 镜像）、Docker、Nginx
- `git clone` 代码到 `/opt/shangchaun`（GitHub 直连失败自动切 `ghfast.top` 镜像）
- 启动 MySQL（Docker）、生成 `.env`（JWT_SECRET 随机化）
- 构建后端 + 后台、用 Prisma `db push` 建表
- 注册 systemd 服务 `shangchaun-server`、写 Nginx 配置、`nginx -t && reload`
- 健康检查

**全程预计 5-15 分钟**（首次需要下载 Node ~25MB、MySQL 镜像 ~150MB、npm 依赖 ~300MB）。

### 3. 打开后台

浏览器访问 `http://1.117.64.57/admin/`，账号 `admin / admin123456`。

---

## 二、必做的善后

```bash
# 1. 改管理员密码
sudo vim /opt/shangchaun/server/.env      # 改 ADMIN_PASSWORD
sudo systemctl restart shangchaun-server

# 2. （可选）改 MySQL 默认密码
sudo vim /opt/shangchaun/deploy/docker-compose.yml      # 改密码
sudo vim /opt/shangchaun/server/.env                    # 同步改 DATABASE_URL
cd /opt/shangchaun/deploy
docker compose down
docker compose up -d
sudo systemctl restart shangchaun-server
```

---

## 三、小程序联调

1. 微信开发者工具 → 导入 `miniprogram/` 目录
2. **详情 → 本地设置 → 不校验合法域名/TLS 版本** 勾上
3. `miniprogram/config.js` 里 `baseURL = 'http://1.117.64.57'`
4. 编译预览

---

## 四、日常维护

| 操作 | 命令 |
|---|---|
| 实时日志 | `journalctl -u shangchaun-server -f` |
| 重启后端 | `sudo systemctl restart shangchaun-server` |
| 查看状态 | `sudo systemctl status shangchaun-server` |
| 更新代码 | `sudo bash /opt/shangchaun/deploy/update.sh` |
| MySQL 状态 | `cd /opt/shangchaun/deploy && docker compose ps` |
| 进入 MySQL | `docker exec -it shangchaun-mysql mysql -ushangchaun -p shangchaun` |
| Nginx 日志 | `tail -f /var/log/nginx/error.log` |

`update.sh` 已包含：`git fetch` 60s 超时 → 失败自动切 ghfast 镜像 → 重装依赖 → 构建 → Prisma 同步 → `systemctl restart`。

---

## 五、域名备案 + HTTPS 切换

1. 在腾讯云申请免费 SSL 证书，下载 Nginx 版上传到服务器 `/etc/nginx/certs/`
2. 编辑 `/etc/nginx/conf.d/shangchaun.conf`，按文件末尾注释段替换为 HTTPS server 段（模板已写好）
3. `sudo nginx -t && sudo systemctl reload nginx`
4. 改 `/opt/shangchaun/server/.env` 的 `PUBLIC_BASE_URL` 为 `https://your-domain.com`
5. `sudo systemctl restart shangchaun-server`
6. 微信公众平台 → 开发管理 → 服务器域名：把 `https://your-domain.com` 加入 `request 合法域名` 和 `downloadFile 合法域名`
7. 改 `miniprogram/config.js` 的 `baseURL` 为 `https://your-domain.com`，开发者工具取消勾选"不校验合法域名"，重新编译

---

## 六、脚本可调参数

`install.sh` / `update.sh` 都支持通过环境变量覆盖默认值：

```bash
# 例：使用其他 GitHub 镜像 + 自建 npm 源
sudo GH_MIRROR_PREFIX=https://mirror.ghproxy.com/ \
     NPM_MIRROR=https://registry.npmmirror.com \
     bash install.sh
```

| 变量 | 默认值 | 说明 |
|---|---|---|
| `APP_DIR` | `/opt/shangchaun` | 代码与运行目录 |
| `GH_MIRROR_PREFIX` | `https://ghfast.top/` | git 直连失败时的镜像前缀 |
| `NPM_MIRROR` | `https://registry.npmmirror.com` | npm registry |
| `NODE_VERSION` | `20.18.1` | Node LTS 版本 |
| `NODE_MIRROR` | `https://npmmirror.com/mirrors/node` | Node 二进制镜像 |
| `PUBLIC_IP` | `1.117.64.57` | 写入 `.env` 的 `PUBLIC_BASE_URL`，决定后端返回图片 URL 的域 |

---

## 七、卸载

```bash
sudo systemctl disable --now shangchaun-server
sudo rm /etc/systemd/system/shangchaun-server.service
sudo rm /etc/nginx/conf.d/shangchaun.conf && sudo systemctl reload nginx
cd /opt/shangchaun/deploy && sudo docker compose down -v   # -v 会删数据
sudo rm -rf /opt/shangchaun
```

---

## 八、目录结构（服务器上）

```
/opt/shangchaun/
├── server/
│   ├── dist/              # tsc 编译产物（生产实际执行）
│   ├── uploads/           # 用户上传图片（Nginx 直接服务）
│   ├── .env               # 实际配置（git 忽略）
│   └── prisma/
├── admin/
│   └── dist/              # Vite 构建产物（Nginx 静态服务 /admin/）
├── miniprogram/           # 服务器上不会跑，本地开发用
└── deploy/
    ├── install.sh
    ├── update.sh
    ├── docker-compose.yml
    ├── mysql-data/        # MySQL 持久化数据（不要乱删！）
    ├── shangchaun-server.service.template
    └── nginx.conf.template
```

---

## 九、常见问题

**Q：脚本运行到某一步看着卡住了。**
另开 SSH 会话查：`top -bn1 | head` 看 CPU 占用、`docker images` 看是否在拉镜像、`ss -tnp | grep :443` 看是否在下载。5 分钟内 CPU、磁盘、网络都为 0 才是真卡。真卡了可以 Ctrl+C 后重跑（脚本幂等）。

**Q：`shangchaun-server` 启动失败。**
`journalctl -u shangchaun-server -n 50 --no-pager`，常见原因：MySQL 没就绪、`.env` 配错。

**Q：登录后上传图片成功但显示不出来。**
检查 `/opt/shangchaun/server/.env` 的 `PUBLIC_BASE_URL` 是不是与浏览器访问的域名一致，改完 `sudo systemctl restart shangchaun-server`。

**Q：小程序请求失败 "不在以下 request 合法域名列表中"。**
开发期：勾"不校验合法域名"；上线：必须用备案 HTTPS 域名并加白名单。
