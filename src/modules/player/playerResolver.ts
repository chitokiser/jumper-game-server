/**
 * modules/player/playerResolver.ts
 * 플레이어 위치/상태 검증 및 보정
 *
 * - accuracy가 너무 나쁜 좌표는 전투 판정에서 제외
 * - 비정상적 이동(순간이동) 감지
 */

import { PlayerState } from '../../types/player.js';
import { isAccuracyTooLow, haversineM } from '../../lib/geo.js';
import { MAX_TRUST_ACCURACY_M } from '../../config/constants.js';

/** 전투 판정에 사용 가능한 좌표인지 */
export function isTrustworthy(player: PlayerState): boolean {
  if (isAccuracyTooLow(player.accuracy)) return false;
  if (player.state !== 'alive') return false;
  return true;
}

/**
 * 이전 위치와 비교해 비정상 이동인지 확인
 * 1틱(1초) 안에 200m 이상 이동은 GPS 오류로 판단
 */
export function isTeleport(
  prev: { lat: number; lng: number },
  next: { lat: number; lng: number },
  elapsedMs: number,
): boolean {
  const dist = haversineM(prev.lat, prev.lng, next.lat, next.lng);
  const maxReasonableSpeed = 30; // m/s (약 108km/h)
  const maxDist = maxReasonableSpeed * (elapsedMs / 1000);
  return dist > maxDist && dist > 200;
}
