/**
 * modules/zone/zoneManager.ts
 * 존 관리자 — 존 활성화/비활성화, 플레이어 입퇴장 처리
 *
 * 설계 원칙:
 * - 플레이어가 한 명도 없는 존은 풀 tick 스킵 (IDLE_TICK_MS 사용)
 * - 플레이어가 들어오면 즉시 활성화
 */

import { getActiveZoneConfigs } from './zoneRegistry.js';
import {
  addPlayerToZone, removePlayerFromZone,
  getPlayersInZone, hasPlayers,
} from './zoneState.js';
import { logger } from '../../lib/logger.js';

/** 플레이어 입장 */
export function playerEnterZone(userId: string, zoneId: string): void {
  addPlayerToZone(zoneId, userId);
  logger.debug('zoneManager', `${userId} entered zone ${zoneId}`);
}

/** 플레이어 퇴장 */
export function playerLeaveZone(userId: string, zoneId: string): void {
  removePlayerFromZone(zoneId, userId);
  logger.debug('zoneManager', `${userId} left zone ${zoneId}`);
}

/** 해당 존에 플레이어가 있는지 */
export function isZoneActive(zoneId: string): boolean {
  return hasPlayers(zoneId);
}

/** 활성 존 목록 (설정상 active=true인 것) */
export function getActiveZones(): string[] {
  return getActiveZoneConfigs().map(z => z.zoneId);
}

/** 존 내 플레이어 목록 */
export function getZonePlayers(zoneId: string): string[] {
  return getPlayersInZone(zoneId);
}
