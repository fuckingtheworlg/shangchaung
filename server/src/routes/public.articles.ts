import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/articles?page=1&pageSize=10
 * 小程序公开列表（仅已发布）
 */
router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));

  const where = { status: 1 };
  const [total, list] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: [{ sort: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, cover: true, createdAt: true,
      },
    }),
  ]);
  res.json({ code: 0, data: { list, total, page, pageSize } });
});

/**
 * GET /api/articles/:id
 * 小程序详情
 */
router.get('/:id', async (req, res) => {
  let id: bigint;
  try {
    id = BigInt(req.params.id);
  } catch {
    return res.status(400).json({ code: 400, message: 'id 非法' });
  }
  const item = await prisma.article.findFirst({
    where: { id, status: 1 },
    select: {
      id: true, title: true, cover: true, content: true, createdAt: true,
    },
  });
  if (!item) return res.status(404).json({ code: 404, message: '不存在或未发布' });
  res.json({ code: 0, data: item });
});

export default router;
