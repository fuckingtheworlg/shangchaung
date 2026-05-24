# 上传（shangchaun）

微信小程序 + 网页管理后台，用于发布 / 展示以图片为主的富文本内容。

## 项目结构

```
shangchaun/
├── server/          # 后端 API（Node.js + Express + TypeScript + Prisma + MySQL）
├── admin/           # 管理后台（React + Vite + Ant Design + wangEditor）
├── miniprogram/     # 微信小程序（原生）
└── deploy/          # 部署相关（Nginx 配置 / docker-compose / 部署手册）
```

## 快速开始（本地开发）

详见各子目录的 README 和 [部署手册](./deploy/README.md)。

### 一键启动顺序

```bash
# 1. 启动 MySQL（Docker）
cd deploy && docker compose up -d

# 2. 启动后端（端口 3000）
cd ../server
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# 3. 启动后台（端口 5173）
cd ../admin
npm install
npm run dev

# 4. 微信开发者工具打开 miniprogram/ 目录
#    （工具中勾选"详情 → 本地设置 → 不校验合法域名"）
```

## 默认管理员账号

- 用户名：`admin`
- 密码：`admin123456`
- 修改入口：`server/.env` 文件的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`

## 小程序配置

- AppID：`wx0a04acd07d76144e`
- 后端地址：在 `miniprogram/config.js` 中切换（开发用 IP，上线换备案后的 HTTPS 域名）

## 部署

服务器：腾讯云轻量应用服务器（OpenCloudOS）`1.117.64.57`

详见 [`deploy/README.md`](./deploy/README.md)。
