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
 *   4. 만료 드랍 정리 (60틱마다)
 *   5. 타임아웃 플레이어 정리 (30틱마다)
 *
 * 설계 원칙:
 * - zone A의 에러가 zone B tick을 멈추지 않는다 (per-zone try/catch)
 * - 플레이어 없는 zone은 AI/전투 스킵 (리스폰만 수행)
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 */

import { TickRunner } from './tickRunner.js';
import { clearTickBuffer, flushTickBuffer } from './worldEvents.js';
import { getActiveZones, isZoneActive } from '../zone/zoneManager.js';
import { getMonstersByZone, setMonster, getAllMonsters } from '../monster/monsterInstanceStore.js';
import { getAllPlayers } from '../player/playerStateStore.js';
import { tickMonsterAi } from '../monster/monsterAiService.js';
import { tickRespawn } from '../monster/monsterRespawnService.js';
import { tickCombat } from '../combat/combatResolver.js';
import { sweepExpiredDrops } from '../drop/dropStore.js';
import { sweepTimedOutPlayers } from '../player/playerSessionManager.js';
import { broadcastMonsterUpdate } from '../gateway/clientSyncService.js';
import { DEFAULT_TICK_MS, PLAYER_SWEEP_EVERY } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';

let ticker: TickRunner | null = null;
let dropSweepCounter = 0;
let playerSweepCounter = 0;
const DROP_SWEEP_EVERY = 60;

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
  const tickStart = Date.now();
  clearTickBuffer();

  // 1. 리스폰 검사 (전 존 공통 — 플레이어 없어도 실행)
  tickRespawn();

  // 2. 활성 존 순회 (per-zone 에러 격리)
  const zones = getActiveZones();
  let activeZoneCount = 0;

  for (const zoneId of zones) {
    const active = isZoneActive(zoneId);
    if (active) activeZoneCount++;

    try {
      const monsters = getMonstersByZone(zoneId);

      // AI 상태 갱신
      // - 활성 존(플레이어 있음): 전체 AI 실행 (추격·순찰·전투)
      // - 비활성 존: 상태 전환(attacking/chasing→idle/return)만 처리, 순찰 이동 스킵
      for (const m of monsters) {
        const updated = tickMonsterAi(m, deltaMs, active);
        if (updated !== m) {
          setMonster(updated);
          // 비활성 존도 상태 전환은 broadcast — 재접속 시 stale 방지
          const stateChanged = updated.state !== m.state;
          if (active || stateChanged) broadcastMonsterUpdate(zoneId, updated);
        }
      }

      // 전투 판정 — 플레이어가 있는 존만
      if (active) tickCombat(zoneId);

    } catch (err) {
      logger.error('worldEngine', `zone tick error [${zoneId}]`, err);
    }
  }

  // 3. 드랍 만료 정리 (60틱마다)
  dropSweepCounter++;
  if (dropSweepCounter >= DROP_SWEEP_EVERY) {
    const removed = sweepExpiredDrops();
    if (removed > 0) logger.debug('worldEngine', `swept ${removed} expired drops`);
    dropSweepCounter = 0;
  }

  // 4. 타임아웃 플레이어 정리 (30틱마다)
  playerSweepCounter++;
  if (playerSweepCounter >= PLAYER_SWEEP_EVERY) {
    const removed = sweepTimedOutPlayers();
    if (removed.length > 0) logger.info('worldEngine', `swept ${removed.length} timed-out players`);
    playerSweepCounter = 0;
  }

  // 5. tick 성능 로그
  const elapsed = Date.now() - tickStart;
  const events = flushTickBuffer();
  const totalPlayers = getAllPlayers().length;
  const totalMonsters = getAllMonsters().filter(m => m.state !== 'dead').length;

  if (elapsed > DEFAULT_TICK_MS * 0.8) {
    // tick이 주기의 80% 이상 소요되면 경고
    logger.warn('worldEngine',
      `slow tick: ${elapsed}ms | zones=${activeZoneCount}/${zones.length} players=${totalPlayers} monsters=${totalMonsters} events=${events.length}`
    );
  } else {
    logger.debug('worldEngine',
      `tick ${elapsed}ms | zones=${activeZoneCount}/${zones.length} players=${totalPlayers} monsters=${totalMonsters} events=${events.length}`
    );
  }
}
