/**
 * src/index.ts
 * 서버 진입점
 *
 * 부팅 순서:
 *   1. 환경변수 로드
 *   2. 월드 데이터 로드 (존 + 스폰 설정)
 *   3. Express + Socket.io 서버 시작
 *   4. 초기 몬스터 스폰
 *   5. World Engine 시작 (tick 시작)
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    이 파일 수정 후 반드시:
 *    cd game-server && git add . && git commit && git push origin main
 */

import { createServer } from 'http';
import app from './app.js';
import { ENV } from './config/env.js';
import { logger } from './lib/logger.js';

// ── 월드 데이터 로드 ──────────────────────────────────────────────────────────
import { loadSpawnConfig, getLoadedZoneConfigs, getAllSpawnConfigs } from './modules/admin/spawnConfigLoader.js';
import { registerZone } from './modules/zone/zoneRegistry.js';
import { initAllSpawns } from './modules/monster/monsterSpawnService.js';
import { getDefaultWorldData } from './config/defaultWorldData.js';

// ── Socket.io 게이트웨이 ───────────────────────────────────────────────────────
import {
  initSocketGateway, getUserId,
} from './modules/gateway/socketGateway.js';
import { joinZone, updateLocation, leaveZone, revivePlayer } from './modules/player/playerSessionManager.js';
import { resolvePlayerAttack } from './modules/combat/combatResolver.js';

// ── World Engine ──────────────────────────────────────────────────────────────
import { startWorldEngine } from './modules/world/worldEngine.js';

async function bootstrap(): Promise<void> {
  // 1. 월드 데이터 로드
  const worldData = getDefaultWorldData();
  loadSpawnConfig(worldData);
  for (const zone of getLoadedZoneConfigs()) {
    registerZone(zone);
  }
  logger.info('bootstrap', `loaded ${getLoadedZoneConfigs().length} zones`);

  // 2. HTTP + Socket.io 서버 생성
  const httpServer = createServer(app);

  initSocketGateway(httpServer, {
    onJoin:     (socketId, data) => joinZone(socketId, data),
    onLocation: (socketId, data) => updateLocation(socketId, data),
    onLeave:    (socketId)       => leaveZone(socketId),
    onAttack:   (socketId, data) => {
      const userId = getUserId(socketId);
      if (userId) resolvePlayerAttack(userId, data.monsterId);
    },
    onRevive:   (socketId)       => revivePlayer(socketId),
  });

  // 3. 서버 시작
  httpServer.listen(ENV.PORT, () => {
    logger.info('bootstrap', `✅ jumper-game-server running on port ${ENV.PORT}`);
    logger.info('bootstrap', `   GET /health  →  status check`);
    logger.info('bootstrap', `   Socket.io     →  ws://localhost:${ENV.PORT}`);
  });

  // 4. 초기 몬스터 스폰
  initAllSpawns(getAllSpawnConfigs());

  // 5. World Engine 시작
  startWorldEngine();
}

bootstrap().catch(err => {
  logger.error('bootstrap', 'fatal error', err);
  process.exit(1);
});
