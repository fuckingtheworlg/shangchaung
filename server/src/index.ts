import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './lib/config';
import authRouter from './routes/auth';
import adminUploadRouter from './routes/admin.upload';
import adminArticlesRouter from './routes/admin.articles';
import adminSettingsRouter from './routes/admin.settings';
import publicArticlesRouter from './routes/public.articles';
import publicSettingsRouter from './routes/public.settings';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 健康检查
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 本地图片静态服务
// 生产环境推荐由 Nginx 直接代理 /uploads 路径以提升性能；这里同时挂载方便本地开发
app.use('/uploads', express.static(config.uploadDir, {
  maxAge: '30d',
  fallthrough: false,
}));

// 后台接口
app.use('/api/admin', authRouter);                  // /api/admin/login
app.use('/api/admin', adminUploadRouter);           // /api/admin/upload
app.use('/api/admin/articles', adminArticlesRouter);
app.use('/api/admin/settings', adminSettingsRouter);

// 公开接口（小程序使用）
app.use('/api/articles', publicArticlesRouter);
app.use('/api/settings', publicSettingsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `Not Found: ${req.method} ${req.path}` });
});

// 统一错误兜底
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[server error]', err);
  res.status(500).json({ code: 500, message: err?.message || 'Internal Error' });
});

app.listen(config.port, () => {
  console.log(`[shangchaun-server] listening on http://0.0.0.0:${config.port}`);
  console.log(`[shangchaun-server] upload dir: ${config.uploadDir}`);
  console.log(`[shangchaun-server] public base: ${config.publicBaseUrl}`);
});
