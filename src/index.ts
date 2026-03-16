/**
 * jumper-game-server / src/index.ts
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Git 저장소: https://github.com/chitokiser/jumper-game-server │
 * │  배포:       Railway (jumper-game-server 저장소 연동)        │
 * │  메인 프로젝트(jumper_v10)와 Git 저장소가 완전히 분리되어 있음  │
 * │  이 파일 수정 후 push 시 반드시 game-server 폴더 안에서:      │
 * │    cd game-server && git add . && git commit && git push  │
 * └─────────────────────────────────────────────────────────┘
 *
 * 역할 (현재 단계: 기반 구축)
 * - HTTP 서버 시작
 * - /health 엔드포인트 (Railway 헬스체크)
 *
 * 다음 개발 단계:
 *  1. zone manager
 *  2. player session
 *  3. monster spawn / respawn
 *  4. monster AI
 *  5. combat engine
 *  6. WebSocket 연결 (merchants.battle.js 연동)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // origin 없음(curl 등) 또는 허용 목록에 있으면 통과
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
// Railway 및 외부에서 서버 생존 여부 확인용
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'jumper-game-server',
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'jumper-game-server',
    version: '1.0.0',
    endpoints: ['/health'],
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[game-server] running on port ${PORT}`);
  console.log(`[game-server] GET /health to verify`);
});
