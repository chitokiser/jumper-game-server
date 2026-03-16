/**
 * modules/monster/monsterTargetService.ts
 * 몬스터 타겟 선정 서비스
 *
 * GPS 오차 대응:
 * 1. accuracy > AGGRO_MAX_ACCURACY_M (30m) → 타겟 선정 보류
 * 2. 위치 갱신 > TARGETING_MAX_STALE_MS (10s) → inactive 제외
 * 3. 어그로 해제는 시작 거리 * AGGRO_RELEASE_MULTIPLIER (히스테리시스)
 *    → 들어올 때: aggroRangeM 이하
 *    → 나갈 때:   aggroRangeM * 1.4 이상이어야 해제
 */

import { MonsterInstance } from '../../types/monster.js';
import { getPlayersInZone } from '../player/playerStateStore.js';
import { isTargetable } from '../player/playerResolver.js';
import { haversineM } from '../../lib/geo.js';
import { AGGRO_RELEASE_MULTIPLIER, MONSTER_LEASH_M } from '../../config/constants.js';

/**
 * 어그로 범위 내 가장 가까운 플레이어 userId 반환
 * - accuracy 엄격 기준 적용 (AGGRO_MAX_ACCURACY_M)
 * - stale(10초 갱신 없음) 플레이어 제외
 */
export function findNearestTarget(monster: MonsterInstance): string | null {
  const players = getPlayersInZone(monster.zoneId);
  let closest: string | null = null;
  let closestDist = Infinity;

  for (const player of players) {
    if (!isTargetable(player)) continue;  // accuracy + stale + alive 복합 검사

    const dist = haversineM(
      monster.currentLat, monster.currentLng,
      player.lat, player.lng,
    );

    if (dist <= monster.aggroRangeM && dist < closestDist) {
      closestDist = dist;
      closest = player.userId;
    }
  }

  return closest;
}

/**
 * 현재 타겟이 유효한지 확인 (히스테리시스 적용)
 *
 * 해제 조건 (하나라도 해당되면 false):
 * - 타겟 없음
 * - 타겟이 isTargetable 실패 (accuracy 불량, stale, dead 등)
 * - 몬스터가 스폰 지점에서 MONSTER_LEASH_M 초과 (귀환 조건)
 * - 몬스터와 타겟 거리가 aggroRangeM * AGGRO_RELEASE_MULTIPLIER 초과 (히스테리시스)
 */
export function isTargetStillValid(monster: MonsterInstance): boolean {
  if (!monster.targetUserId) return false;

  const players = getPlayersInZone(monster.zoneId);
  const target = players.find(p => p.userId === monster.targetUserId);
  if (!target || !isTargetable(target)) return false;

  // 스폰 기준 leash 초과 → 귀환
  const distFromSpawn = haversineM(
    monster.currentLat, monster.currentLng,
    monster.spawnLat, monster.spawnLng,
  );
  if (distFromSpawn > MONSTER_LEASH_M) return false;

  // 히스테리시스: 어그로 범위 * 1.4 이상 벗어나야 해제
  const distToTarget = haversineM(
    monster.currentLat, monster.currentLng,
    target.lat, target.lng,
  );
  if (distToTarget > monster.aggroRangeM * AGGRO_RELEASE_MULTIPLIER) return false;

  return true;
}
