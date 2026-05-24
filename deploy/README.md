# 部署手册（腾讯云轻量服务器 1.117.64.57）

> 操作系统：OpenCloudOS（CentOS / RHEL 系）
> 部署路径：`/var/www/shangchaun`
> 部署方式：GitHub 仓库 + `git pull` + PM2

---

## 一、服务器一次性环境准备

### 1. 安装基础工具

```bash
# Git
sudo dnf install -y git curl wget vim

# Node.js 20 (用 nvm，方便后续切版本)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20
node -v && npm -v

# PM2
npm install -g pm2

# Nginx
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Docker（用于跑 MySQL）
curl -fsSL https://get.docker.com | bash
sudo systemctl enable --now docker
# 当前用户加入 docker 组（避免 sudo）
sudo usermod -aG docker $USER
# 重新登录使其生效
```

### 2. 防火墙

```bash
# 腾讯云轻量需要在【控制台 → 防火墙】里放行：
#   - 22  (SSH)
#   - 80  (HTTP)
#   - 443 (HTTPS，备案后用)
# MySQL 3306 不要对外开放，docker-compose.yml 里已限制为 127.0.0.1
```

---

## 二、首次部署

### 1. 克隆仓库

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/fuckingtheworlg/shangchaung.git shangchaun
cd shangchaun
```

### 2. 启动 MySQL

```bash
cd deploy
docker compose up -d
docker compose ps              # 等到 healthy
cd ..
```

> 默认数据库账号见 `deploy/docker-compose.yml`，**生产请改密码**。

### 3. 后端

```bash
cd server
cp .env.example .env
vim .env
# 必改项：
#   ADMIN_PASSWORD       管理员密码
#   JWT_SECRET           换成长随机字符串（openssl rand -hex 32）
#   PUBLIC_BASE_URL      改成  http://1.117.64.57  (备案后改 https://your-domain)
#   DATABASE_URL         如果你改了 MySQL 密码，这里同步

npm install
npx prisma migrate deploy      # 应用数据库迁移
npm run build                  # 编译 TypeScript 到 dist/
cd ..
```

### 4. 后台前端

```bash
cd admin
npm install
npm run build                  # 产物在 admin/dist/
cd ..
```

### 5. Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/shangchaun.conf
# 如果默认有 /etc/nginx/conf.d/default.conf，先删/改它的 server_name
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 启动后端进程

```bash
mkdir -p logs
pm2 start deploy/ecosystem.config.js
pm2 save                       # 保存当前进程列表
pm2 startup                    # 按提示再执行一行 systemctl 命令，让 PM2 开机自启
```

### 7. 验证

```bash
curl http://127.0.0.1:3000/health
curl http://1.117.64.57/health                # 经过 Nginx
curl http://1.117.64.57/api/articles          # 应返回空列表 {"code":0,"data":{"list":[],"total":0,...}}
```

浏览器打开 `http://1.117.64.57/admin/` 看到登录页即成功。

---

## 三、后续更新（最常用）

只要本地推到 GitHub，服务器执行：

```bash
cd /var/www/shangchaun
bash deploy/deploy.sh
```

脚本会自动 pull、装依赖、迁移数据库、构建、PM2 重启。

---

## 四、小程序联调

1. 打开微信开发者工具 → 导入 `miniprogram/` 目录
2. **详情 → 本地设置 → 不校验合法域名/TLS 版本** 勾上（开发期必须）
3. `miniprogram/config.js` 里 `baseURL = 'http://1.117.64.57'`
4. 编译预览即可

---

## 五、域名备案完成后切到 HTTPS

1. 在腾讯云申请免费 SSL 证书（绑定 your-domain.com）
2. 下载 Nginx 版证书，上传到 `/etc/nginx/certs/`
3. 编辑 `/etc/nginx/conf.d/shangchaun.conf`，启用文件末尾的 HTTPS server 段
4. `sudo nginx -t && sudo systemctl reload nginx`
5. 修改 `server/.env` 里的 `PUBLIC_BASE_URL` 为 `https://your-domain.com`，`pm2 restart shangchaun-server`
6. 微信公众平台 → 开发管理 → 服务器域名：把 `https://your-domain.com` 加到 `request 合法域名` 和 `downloadFile 合法域名`
7. 修改 `miniprogram/config.js` 里 `baseURL` 为 `https://your-domain.com`
8. 微信开发者工具取消勾选"不校验合法域名"，重新编译验证

---

## 六、目录结构（服务器上）

```
/var/www/shangchaun/
├── server/
│   ├── dist/              # tsc 编译产物
│   ├── uploads/           # 用户上传图片（由 Nginx 直接服务）
│   ├── .env               # 实际配置（不入 git）
│   └── prisma/
├── admin/
│   └── dist/              # Vite 构建产物（由 Nginx 静态服务 /admin/）
├── miniprogram/           # 小程序源码（服务器上没用，本地用）
├── deploy/
│   ├── mysql-data/        # MySQL 数据（不要删！）
│   └── ...
└── logs/                  # PM2 日志
```

---

## 七、常见问题

**Q：登录返回 401，但密码是对的？**
检查 `server/.env` 是否被改对，且执行过 `pm2 restart shangchaun-server`。

**Q：图片上传成功但显示不出来？**
检查 `server/.env` 的 `PUBLIC_BASE_URL` 是不是和外网访问的 URL 一致。
返回的图片 URL 形如 `${PUBLIC_BASE_URL}/uploads/YYYY-MM/xxx.jpg`，浏览器能打开就是对的。

**Q：小程序请求失败 "不在以下 request 合法域名列表中"？**
开发期：勾选"不校验合法域名"。上线：必须用备案 HTTPS 域名并加白名单。

**Q：数据库迁移失败？**
确认 docker mysql 在跑：`docker compose ps`；确认 `.env` 的 `DATABASE_URL` 用户名密码与 `docker-compose.yml` 一致。
