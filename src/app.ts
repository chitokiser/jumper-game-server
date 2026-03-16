/**
 * src/app.ts
 * Express 앱 설정
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    Railway 배포 전용 — 메인 프로젝트(jumper_v10)와 완전 분리
 */

import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import healthRouter from './routes/health.js';
import adminRouter  from './routes/admin.js';

const app = express();

app.use(cors({ origin: ENV.ALLOWED_ORIGINS }));
app.use(express.json());

app.use('/', healthRouter);
app.use('/', adminRouter);

export default app;
