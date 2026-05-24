import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../lib/config';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const { username, password } = parsed.data;
  if (username !== config.adminUsername || password !== config.adminPassword) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  const token = jwt.sign({ username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  res.json({ code: 0, data: { token, username } });
});

export default router;
