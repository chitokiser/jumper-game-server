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
  /** CORS 허용 오리진 (콤마 구분, 미설정 시 전체 허용) */
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : '*',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  /** 관리자 REST API 보조 인증 키 (X-Admin-Key 헤더, 서버 스크립트용) — 미설정이면 이 방식은 꺼진다.
   *  브라우저 관리자는 Firebase 로그인 토큰으로 인증한다 (lib/auth.ts). 기본값을 두지 말 것. */
  ADMIN_SECRET: process.env.ADMIN_SECRET || '',
  /** 로그인 토큰 검증용 Firebase 프로젝트 */
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'jumper-b15aa',
} as const;
