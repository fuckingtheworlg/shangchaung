import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';

const router = Router();

router.use(authRequired);

const articleSchema = z.object({
  title: z.string().min(1).max(200),
  cover: z.string().max(500).optional().nullable(),
  content: z.string().default(''),
  status: z.number().int().min(0).max(1).default(0),
  sort: z.number().int().default(0),
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const keyword = (req.query.keyword as string | undefined)?.trim();
  const status = req.query.status !== undefined && req.query.status !== ''
    ? Number(req.query.status)
    : undefined;

  const where: any = {};
  if (keyword) where.title = { contains: keyword };
  if (status === 0 || status === 1) where.status = status;

  const [total, list] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: [{ sort: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, cover: true, status: true,
        sort: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);
  res.json({ code: 0, data: { list, total, page, pageSize } });
});

router.get('/:id', async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.article.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ code: 404, message: '不存在' });
  res.json({ code: 0, data: item });
});

router.post('/', async (req, res) => {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '参数错误', errors: parsed.error.flatten() });
  }
  const item = await prisma.article.create({ data: parsed.data });
  res.json({ code: 0, data: item });
});

router.put('/:id', async (req, res) => {
  const id = BigInt(req.params.id);
  const parsed = articleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '参数错误', errors: parsed.error.flatten() });
  }
  try {
    const item = await prisma.article.update({ where: { id }, data: parsed.data });
    res.json({ code: 0, data: item });
  } catch {
    res.status(404).json({ code: 404, message: '不存在' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = BigInt(req.params.id);
  try {
    await prisma.article.delete({ where: { id } });
    res.json({ code: 0 });
  } catch {
    res.status(404).json({ code: 404, message: '不存在' });
  }
});

export default router;
