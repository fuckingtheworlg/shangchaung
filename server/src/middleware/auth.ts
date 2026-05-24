import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';

export interface AuthedRequest extends Request {
  admin?: { username: string };
}

export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { username: string };
    req.admin = { username: payload.username };
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}
