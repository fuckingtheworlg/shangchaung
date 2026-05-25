import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';

const router = Router();

router.use(authRequired);

// 允许的 key 白名单 + 每个 key 的值校验规则
const SCHEMAS: Record<string, z.ZodType<string>> = {
  // 封面长宽比：限定 4 个预设
  cover_aspect_ratio: z.enum(['1:1', '4:3', '16:9', '3:4']),
};

// 全部设置（key -> value 字典）
router.get('/', async (_req, res) => {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json({ code: 0, data: map });
});

const putSchema = z.record(z.string(), z.string());

// 批量更新（前端一次提交多个 key）
router.put('/', async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const entries = Object.entries(parsed.data);
  for (const [k, v] of entries) {
    const schema = SCHEMAS[k];
    if (!schema) {
      return res.status(400).json({ code: 400, message: `未知配置项: ${k}` });
    }
    const r = schema.safeParse(v);
    if (!r.success) {
      return res.status(400).json({ code: 400, message: `${k} 取值非法` });
    }
  }
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
  res.json({ code: 0 });
});

export default router;
