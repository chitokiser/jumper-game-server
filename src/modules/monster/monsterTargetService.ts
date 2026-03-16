/**
 * modules/monster/monsterTargetService.ts
 * 몬스터 타겟 선정 서비스
 *
 * - 어그로 범위 내 가장 가까운 alive 플레이어 탐색
 * - accuracy가 나쁜 플레이어는 제외
 */

import { MonsterInstance } from '../../types/monster.js';
import { getPlayersInZone } from '../player/playerStateStore.js';
import { isTrustworthy } from '../player/playerResolver.js';
import { haversineM } from '../../lib/geo.js';

/**
 * 어그로 범위 내 가장 가까운 플레이어 userId 반환
 * 없으면 null
 */
export function findNearestTarget(monster: MonsterInstance): string | null {
  const players = getPlayersInZone(monster.zoneId);
  let closest: string | null = null;
  let closestDist = Infinity;

  for (const player of players) {
    if (!isTrustworthy(player)) continue;

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
 * 현재 타겟이 여전히 어그로 범위 + alive 인지 확인
 * false면 타겟 해제 → return 상태로 전환
 */
export function isTargetStillValid(monster: MonsterInstance, leashM: number): boolean {
  if (!monster.targetUserId) return false;
  const players = getPlayersInZone(monster.zoneId);
  const target = players.find(p => p.userId === monster.targetUserId);
  if (!target || !isTrustworthy(target)) return false;

  // 스폰 지점 기준 leash 거리 초과 시 복귀
  const distFromSpawn = haversineM(
    monster.currentLat, monster.currentLng,
    monster.spawnLat, monster.spawnLng,
  );
  if (distFromSpawn > leashM) return false;

  return true;
}
