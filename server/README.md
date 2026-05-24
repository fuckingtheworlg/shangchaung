# 上传项目 - 后端

Node.js + Express + TypeScript + Prisma + MySQL。

## 启动

```bash
cp .env.example .env
npm install
# 首次需要 MySQL 已启动（见 ../deploy/docker-compose.yml）
npx prisma migrate dev --name init
npm run dev      # 开发模式，端口 3000
```

## 构建并以生产模式运行

```bash
npm run build
npm run prisma:deploy   # 应用迁移
npm start
```

## 接口约定

返回统一格式：

```json
{ "code": 0, "data": { ... } }       // 成功
{ "code": 4xx, "message": "..." }    // 失败
```

上传接口同时兼容 wangEditor 的 `{ errno, data: { url } }` 格式。

## 接口一览

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/health` | 健康检查 | ❌ |
| POST | `/api/admin/login` | 管理员登录 | ❌ |
| POST | `/api/admin/upload` | 图片上传 | ✅ |
| GET | `/api/admin/articles` | 文章列表（含草稿） | ✅ |
| GET | `/api/admin/articles/:id` | 文章详情 | ✅ |
| POST | `/api/admin/articles` | 新建 | ✅ |
| PUT | `/api/admin/articles/:id` | 更新 | ✅ |
| DELETE | `/api/admin/articles/:id` | 删除 | ✅ |
| GET | `/api/articles` | 小程序列表（仅已发布） | ❌ |
| GET | `/api/articles/:id` | 小程序详情 | ❌ |
