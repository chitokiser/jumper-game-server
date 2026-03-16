/**
 * config/env.ts
 * 환경변수 중앙 관리
 * Railway는 PORT를 자동으로 주입한다.
 */

import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  /** CORS 허용 오리진 (콤마 구분) */
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5501,http://127.0.0.1:5501')
    .split(',').map(s => s.trim()).filter(Boolean),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;
