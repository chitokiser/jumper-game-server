/**
 * modules/world/worldEngine.ts
 * 월드 엔진 — 서버의 심장
 *
 * 매 tick마다:
 *   1. 모든 활성 존 순회
 *   2. 리스폰 검사 (플레이어 없는 존도 실행)
 *   3. 플레이어가 있는 존만 풀 tick:
 *      - AI 상태 갱신
 *      - 전투 판정
 *   4. 만료 드랍 정리 (60초마다)
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 */

import { TickRunner } from './tickRunner.js';
import { getActiveZones, isZoneActive } from '../zone/zoneManager.js';
import { getMonstersByZone, setMonster } from '../monster/monsterInstanceStore.js';
import { tickMonsterAi } from '../monster/monsterAiService.js';
import { tickRespawn } from '../monster/monsterRespawnService.js';
import { tickCombat } from '../combat/combatResolver.js';
import { sweepExpiredDrops } from '../drop/dropStore.js';
import { broadcastMonsterUpdate } from '../gateway/clientSyncService.js';
import { DEFAULT_TICK_MS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';

let ticker: TickRunner | null = null;
let dropSweepCounter = 0;
const DROP_SWEEP_EVERY = 60; // 60틱마다 드랍 정리

export function startWorldEngine(): void {
  if (ticker) return;

  ticker = new TickRunner('world', DEFAULT_TICK_MS, async (deltaMs) => {
    await worldTick(deltaMs);
  });

  ticker.start();
  logger.info('worldEngine', '▶ World Engine started');
}

export function stopWorldEngine(): void {
  ticker?.stop();
  ticker = null;
  logger.info('worldEngine', '■ World Engine stopped');
}

async function worldTick(deltaMs: number): Promise<void> {
  // 1. 리스폰 검사 (전 존 공통)
  tickRespawn();

  // 2. 활성 존 순회
  const zones = getActiveZones();
  for (const zoneId of zones) {
    // 플레이어 없으면 AI/전투 스킵
    if (!isZoneActive(zoneId)) continue;

    const monsters = getMonstersByZone(zoneId);
    for (const m of monsters) {
      // AI 상태 갱신
      const updated = tickMonsterAi(m, deltaMs);
      if (updated !== m) {
        setMonster(updated);
        broadcastMonsterUpdate(zoneId, updated);
      }
    }

    // 전투 판정 (attacking 상태 몬스터)
    tickCombat(zoneId);
  }

  // 3. 드랍 만료 정리
  dropSweepCounter++;
  if (dropSweepCounter >= DROP_SWEEP_EVERY) {
    const removed = sweepExpiredDrops();
    if (removed > 0) logger.debug('worldEngine', `swept ${removed} expired drops`);
    dropSweepCounter = 0;
  }
}
