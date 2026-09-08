import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

/** 照片类压缩默认参数（与 skill optimize-upload-images 对齐） */
export const IMAGE_COMPRESS = {
  maxEdge: 1920,
  quality: 80,
  /** 低于此体积且边长已够小则跳过，避免无意义重压 */
  skipUnderBytes: 200 * 1024,
} as const;

const COMPRESSIBLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff']);
const SKIP = new Set(['.gif', '.svg']); // 动图 / 矢量不压

export function isCompressibleImage(ext: string): boolean {
  return COMPRESSIBLE.has(ext.toLowerCase());
}

export function shouldSkipCompress(ext: string): boolean {
  return SKIP.has(ext.toLowerCase());
}

export interface CompressResult {
  /** 最终落盘路径 */
  outPath: string;
  /** 相对 uploads 根的路径，正斜杠 */
  relativePath: string;
  bytesBefore: number;
  bytesAfter: number;
  skipped: boolean;
}

/**
 * 将照片压成 JPEG（最长边 ≤ maxEdge，质量 quality），写出到 outPath。
 * 失败抛错，由调用方决定是否回退原图。
 */
export async function compressToJpeg(
  input: Buffer | string,
  outPath: string,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<{ bytesBefore: number; bytesAfter: number; skipped: boolean }> {
  const maxEdge = opts.maxEdge ?? IMAGE_COMPRESS.maxEdge;
  const quality = opts.quality ?? IMAGE_COMPRESS.quality;

  const bytesBefore =
    typeof input === 'string' ? fs.statSync(input).size : input.length;

  const pipeline = sharp(input, { failOn: 'none' }).rotate(); // 按 EXIF 纠正方向
  const meta = await pipeline.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const longEdge = Math.max(w, h);

  // 已很小且边长够小：仍统一转 JPEG 以便扩展名一致；若本身已是小 jpeg 可跳过
  if (
    bytesBefore <= IMAGE_COMPRESS.skipUnderBytes &&
    longEdge > 0 &&
    longEdge <= maxEdge &&
    (meta.format === 'jpeg' || meta.format === 'jpg')
  ) {
    if (typeof input === 'string' && path.resolve(input) === path.resolve(outPath)) {
      return { bytesBefore, bytesAfter: bytesBefore, skipped: true };
    }
    // 仍写出一份（拷贝语义），保证 outPath 存在
    await sharp(input).jpeg({ quality, mozjpeg: true }).toFile(outPath);
    const bytesAfter = fs.statSync(outPath).size;
    return { bytesBefore, bytesAfter, skipped: true };
  }

  let img = sharp(input, { failOn: 'none' }).rotate();
  if (longEdge > maxEdge) {
    img = img.resize({
      width: w >= h ? maxEdge : undefined,
      height: h > w ? maxEdge : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  await img.jpeg({ quality, mozjpeg: true }).toFile(outPath);
  const bytesAfter = fs.statSync(outPath).size;
  return { bytesBefore, bytesAfter, skipped: false };
}
