/**
 * modules/zone/zoneManager.ts
 * 존 관리자 — 존 활성화/비활성화, 플레이어 입퇴장 처리
 *
 * 설계 원칙:
 * - 플레이어가 한 명도 없는 존은 풀 tick 스킵 (리스폰만 수행)
 * - 플레이어가 들어오면 즉시 활성화
 * - joinZone 시 zoneId 존재 여부 + 좌표 범위 검사
 * - 범위 밖이면 가장 가까운 존으로 재배정
 */

import { getActiveZoneConfigs, getZoneConfig } from './zoneRegistry.js';
import {
  addPlayerToZone, removePlayerFromZone,
  getPlayersInZone, hasPlayers,
} from './zoneState.js';
import { haversineM } from '../../lib/geo.js';
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

/**
 * 요청한 zoneId가 유효한지 확인
 * - zoneId가 registry에 존재하고 active인가
 * - 플레이어 좌표가 zone 반경 안인가 (좌표 제공 시)
 * @returns 유효하면 zoneId, 아니면 null
 */
export function resolveZoneId(
  requestedZoneId: string,
  lat?: number,
  lng?: number,
): string | null {
  const config = getZoneConfig(requestedZoneId);
  if (!config || !config.active) return null;

  // 좌표가 없으면 zoneId 존재 여부만 확인
  if (lat === undefined || lng === undefined) return requestedZoneId;

  const dist = haversineM(lat, lng, config.centerLat, config.centerLng);
  if (dist <= config.radiusM) return requestedZoneId;

  // 범위 밖이면 가장 가까운 존으로 재배정
  const nearest = findNearestZone(lat, lng);
  if (nearest) {
    logger.debug('zoneManager',
      `${requestedZoneId} rejected (dist=${Math.round(dist)}m), reassigned to ${nearest}`
    );
    return nearest;
  }

  return null;
}

/**
 * 좌표 기준 가장 가까운 활성 존 반환
 * 모든 활성 존에서 중심 거리가 가장 짧은 것을 선택
 */
export function findNearestZone(lat: number, lng: number): string | null {
  const zones = getActiveZoneConfigs();
  let nearest: string | null = null;
  let minDist = Infinity;

  for (const zone of zones) {
    const dist = haversineM(lat, lng, zone.centerLat, zone.centerLng);
    if (dist < minDist) {
      minDist = dist;
      nearest = zone.zoneId;
    }
  }

  return nearest;
}
