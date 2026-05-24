import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});

// 处理 BigInt 序列化（Prisma 返回的 id 是 BigInt，JSON.stringify 会报错）
// 全局补丁，让 BigInt 序列化为字符串
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
