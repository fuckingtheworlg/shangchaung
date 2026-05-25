import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// 小程序公开读取所有设置（含默认值兜底）
const DEFAULTS: Record<string, string> = {
  cover_aspect_ratio: '1:1',
};

router.get('/', async (_req, res) => {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  res.json({ code: 0, data: map });
});

export default router;
