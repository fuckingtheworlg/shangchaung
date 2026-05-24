import 'dotenv/config';
import path from 'node:path';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: required('JWT_SECRET', 'dev-secret-please-change'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: required('ADMIN_USERNAME', 'admin'),
  adminPassword: required('ADMIN_PASSWORD', 'admin123456'),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
} as const;
