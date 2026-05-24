# 上传项目 - 管理后台

React + Vite + Ant Design 5 + wangEditor v5。

## 启动

```bash
npm install
npm run dev    # http://localhost:5173/admin/
```

开发时通过 Vite 代理把 `/api`、`/uploads` 转发到 `http://localhost:3000`（后端默认端口）。

## 构建

```bash
npm run build
# 产物在 dist/，部署时复制到 Nginx 的 /var/www/admin/ 即可
```

## 默认登录

- 用户名 / 密码：`admin / admin123456`
- 如需修改：编辑后端 `server/.env` 的 `ADMIN_USERNAME / ADMIN_PASSWORD` 并重启后端。

## 注意

- `base: '/admin/'` 是为了让构建产物部署在 `http://<host>/admin/` 路径下，与小程序的 API 路径 `/api/` 共用一个域名/端口。
- 路由使用 HashRouter，避免 Nginx 配置 history fallback。
