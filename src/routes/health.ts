/**
 * routes/health.ts
 * 헬스체크 라우터 — Railway 생존 확인용
 */

import { Router, Request, Response } from 'express';
import { connectedCount } from '../modules/gateway/socketGateway.js';
import { getAllMonsters } from '../modules/monster/monsterInstanceStore.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const monsters = getAllMonsters();
  res.json({
    status:    'ok',
    service:   'jumper-game-server',
    uptime:    Math.floor(process.uptime()),
    players:   connectedCount(),
    monsters:  monsters.length,
    alive:     monsters.filter(m => m.state !== 'dead' && m.state !== 'respawning').length,
  });
});

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'jumper-game-server', version: '1.0.0' });
});

export default router;
