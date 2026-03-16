/**
 * modules/player/playerResolver.ts
 * 플레이어 위치/상태 검증 및 보정
 *
 * GPS 오차 대응 4원칙:
 * 1. 어그로 시작/해제 거리 분리 (monsterTargetService에서 적용)
 * 2. accuracy 불량 → 전투/타겟 판정 보류 (isTrustworthy, isTargetable)
 * 3. 순간이동 감지 → 위치 보류 (isTeleport)
 * 4. 위치 갱신 장기 없음 → inactive (isStale)
 */

import { PlayerState } from '../../types/player.js';
import { isAccuracyTooLow, haversineM } from '../../lib/geo.js';
import {
  MAX_TRUST_ACCURACY_M,
  AGGRO_MAX_ACCURACY_M,
  MAX_REASONABLE_SPEED_MS,
  MIN_TELEPORT_DIST_M,
  TARGETING_MAX_STALE_MS,
} from '../../config/constants.js';
import { now } from '../../lib/time.js';

/**
 * 전투 피해 판정에 사용 가능한 좌표인지
 * (관대한 기준: accuracy 100m 이하)
 */
export function isTrustworthy(player: PlayerState): boolean {
  if (isAccuracyTooLow(player.accuracy)) return false;
  if (player.state !== 'alive') return false;
  return true;
}

/**
 * 몬스터 어그로 타겟 선정에 사용 가능한 좌표인지
 * (엄격한 기준: accuracy 30m 이하 + 10초 이내 갱신)
 */
export function isTargetable(player: PlayerState): boolean {
  if (!isTrustworthy(player)) return false;
  if (player.accuracy > AGGRO_MAX_ACCURACY_M) return false;
  if (isStale(player)) return false;
  return true;
}

/**
 * 위치 갱신이 오래 없어 타겟 선정 대상에서 제외해야 하는 상태인지
 * (10초 이상 갱신 없으면 inactive 처리)
 */
export function isStale(player: PlayerState): boolean {
  return now() - player.lastSeenAt > TARGETING_MAX_STALE_MS;
}

/**
 * 순간이동성 좌표 이동인지 확인
 * - 1회 보류 원칙: true이면 해당 위치 업데이트 무시
 * - 기준: MIN_TELEPORT_DIST_M 이상 이동 + MAX_REASONABLE_SPEED_MS 초과
 */
export function isTeleport(
  prev: { lat: number; lng: number },
  next: { lat: number; lng: number },
  elapsedMs: number,
): boolean {
  const dist = haversineM(prev.lat, prev.lng, next.lat, next.lng);
  if (dist < MIN_TELEPORT_DIST_M) return false; // 소량 이동은 GPS drift로 허용
  const maxDist = MAX_REASONABLE_SPEED_MS * (elapsedMs / 1000);
  return dist > maxDist;
}
