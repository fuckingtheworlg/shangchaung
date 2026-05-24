import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from '../lib/config';
import { authRequired } from '../middleware/auth';

const router = Router();

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sub = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dir = path.join(config.uploadDir, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const hash = crypto.randomBytes(8).toString('hex');
    const name = `${Date.now()}_${hash}${ext}`;
    cb(null, name);
  },
});

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 单文件 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new Error('仅支持 jpg/png/gif/webp/bmp/svg 格式'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/admin/upload
 * form-data: file=<image>
 * 返回 wangEditor 自定义上传所期望的格式：
 * { errno: 0, data: { url } }
 * 同时附带通用字段 url 方便其他地方使用
 */
router.post('/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ errno: 1, message: '未收到文件' });
  }
  const rel = path
    .relative(config.uploadDir, req.file.path)
    .split(path.sep)
    .join('/');
  const url = `${config.publicBaseUrl}/uploads/${rel}`;
  res.json({
    errno: 0,
    data: { url },
    code: 0,
    url,
  });
});

// multer 错误统一处理（必须 4 参数）
router.use((err: Error, _req: any, res: any, _next: any) => {
  res.status(400).json({ errno: 1, message: err.message });
});

export default router;
