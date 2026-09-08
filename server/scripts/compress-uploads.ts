#!/usr/bin/env npx tsx
/**
 * 存量图片批压：扫描 uploads/，照片类压成 JPEG（最长边 1920、质量 80）。
 *
 * 用法（在 server/ 目录）：
 *   npx tsx scripts/compress-uploads.ts
 *   npx tsx scripts/compress-uploads.ts --dry-run
 *
 * PNG/WebP/BMP → .jpg 时会：
 *   1. 写出新 .jpg 并删除旧文件
 *   2. 用 Prisma 把 articles.cover / articles.content 里的旧 URL 替换为新 URL
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  compressToJpeg,
  isCompressibleImage,
  shouldSkipCompress,
  IMAGE_COMPRESS,
} from '../src/lib/imageCompress';
import { config } from '../src/lib/config';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function replaceUrlInDb(oldUrl: string, newUrl: string) {
  if (oldUrl === newUrl) return 0;
  // MySQL REPLACE
  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE articles SET cover = REPLACE(cover, ?, ?) WHERE cover LIKE ?`,
    oldUrl,
    newUrl,
    `%${oldUrl}%`,
  );
  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE articles SET content = REPLACE(content, ?, ?) WHERE content LIKE ?`,
    oldUrl,
    newUrl,
    `%${oldUrl}%`,
  );
  return Number(r1) + Number(r2);
}

function toPublicUrl(absPath: string): string {
  const rel = path.relative(config.uploadDir, absPath).split(path.sep).join('/');
  return `${config.publicBaseUrl}/uploads/${rel}`;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function main() {
  console.log(`[compress] uploadDir=${config.uploadDir} dryRun=${dryRun}`);
  console.log(`[compress] maxEdge=${IMAGE_COMPRESS.maxEdge} quality=${IMAGE_COMPRESS.quality}`);

  const files = await walk(config.uploadDir);
  let compressed = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (shouldSkipCompress(ext) || !isCompressibleImage(ext)) {
      skipped++;
      continue;
    }

    const before = fs.statSync(file).size;
    // 已很小的 jpeg 跳过
    if (before <= IMAGE_COMPRESS.skipUnderBytes && (ext === '.jpg' || ext === '.jpeg')) {
      skipped++;
      continue;
    }

    const dir = path.dirname(file);
    const base = path.basename(file, ext);
    const outJpg = path.join(dir, `${base}.jpg`);
    const tmp = path.join(dir, `${base}.__tmp__.jpg`);

    try {
      if (dryRun) {
        console.log(`[dry-run] would compress ${file} (${(before / 1024).toFixed(0)}KB)`);
        compressed++;
        continue;
      }

      await compressToJpeg(file, tmp);
      const after = fs.statSync(tmp).size;

      // 压完反而更大：丢弃，保留原图
      if (after >= before && (ext === '.jpg' || ext === '.jpeg') && path.resolve(file) === path.resolve(outJpg)) {
        fs.unlinkSync(tmp);
        skipped++;
        continue;
      }

      // 覆盖 / 换名
      if (ext === '.jpg' || ext === '.jpeg') {
        fs.renameSync(tmp, file); // 同路径覆盖
        console.log(`[ok] ${file}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
      } else {
        // png/webp/bmp → jpg：换扩展名，删旧文件，改库
        fs.renameSync(tmp, outJpg);
        const oldUrl = toPublicUrl(file);
        const newUrl = toPublicUrl(outJpg);
        fs.unlinkSync(file);
        const n = await replaceUrlInDb(oldUrl, newUrl);
        console.log(
          `[ok] ${file} → ${outJpg}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB` +
            (n ? ` (db rows touched≈${n})` : ''),
        );
      }

      compressed++;
      savedBytes += Math.max(0, before - after);
    } catch (e: any) {
      failed++;
      console.warn(`[fail] ${file}: ${e?.message}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }

  console.log(
    `[done] compressed=${compressed} skipped=${skipped} failed=${failed} saved≈${(savedBytes / 1024 / 1024).toFixed(1)}MB`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
