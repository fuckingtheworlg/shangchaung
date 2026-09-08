import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from '../lib/config';
import { authRequired } from '../middleware/auth';
import {
  compressToJpeg,
  isCompressibleImage,
  shouldSkipCompress,
} from '../lib/imageCompress';

const router = Router();

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const MAX_UPLOAD_MB = 1024;
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sub = new Date().toISOString().slice(0, 7);
    const dir = path.join(config.uploadDir, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const hash = crypto.randomBytes(8).toString('hex');
    // 照片类先用临时扩展名落盘，压缩后改成 .jpg，避免与最终文件冲突
    const name = `${Date.now()}_${hash}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new Error('仅支持 jpg/png/gif/webp/bmp/svg 格式'));
    }
    cb(null, true);
  },
});

function publicUrl(absPath: string): string {
  const rel = path.relative(config.uploadDir, absPath).split(path.sep).join('/');
  return `${config.publicBaseUrl}/uploads/${rel}`;
}

/**
 * POST /api/admin/upload
 * 照片类：落盘后压成 JPEG（最长边 1920、质量 80）；gif/svg 原样保留。
 * 上传上限仍为 1GB，压缩失败则回退保留原图。
 */
router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ errno: 1, message: '未收到文件' });
  }

  const origPath = req.file.path;
  const origExt = path.extname(origPath).toLowerCase();

  try {
    let finalPath = origPath;

    if (shouldSkipCompress(origExt)) {
      // gif / svg 不压
    } else if (isCompressibleImage(origExt)) {
      const dir = path.dirname(origPath);
      const base = path.basename(origPath, origExt);
      const jpgPath = path.join(dir, `${base}.jpg`);
      const tmpPath = path.join(dir, `${base}.__cmp__.jpg`);

      try {
        const r = await compressToJpeg(origPath, tmpPath);
        // 用压缩结果替换：删原文件，tmp → jpg
        fs.unlinkSync(origPath);
        fs.renameSync(tmpPath, jpgPath);
        finalPath = jpgPath;
        console.log(
          `[upload] compress ${req.file.originalname}: ${(r.bytesBefore / 1024).toFixed(0)}KB → ${(r.bytesAfter / 1024).toFixed(0)}KB` +
            (r.skipped ? ' (light)' : ''),
        );
      } catch (e: any) {
        console.warn('[upload] compress failed, keep original:', e?.message);
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        // 保留 origPath
      }
    }

    const url = publicUrl(finalPath);
    res.json({
      errno: 0,
      data: { url },
      code: 0,
      url,
    });
  } catch (e: any) {
    console.error('[upload] error', e);
    // 尽量清理残留
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch { /* ignore */ }
    res.status(500).json({ errno: 1, message: e?.message || '上传失败' });
  }
});

router.use((err: any, _req: any, res: any, _next: any) => {
  let message = err?.message || '上传失败';
  if (err?.code === 'LIMIT_FILE_SIZE') {
    message = `图片超过大小限制（最大 ${MAX_UPLOAD_MB}MB）`;
  }
  res.status(400).json({ errno: 1, message });
});

export default router;
