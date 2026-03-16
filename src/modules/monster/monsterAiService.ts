/**
 * modules/monster/monsterAiService.ts
 * 몬스터 AI — 반경형 상태 머신
 *
 * 상태 전환:
 *   idle      → chasing   (어그로 범위 내 플레이어 감지)
 *   chasing   → attacking (공격 사거리 진입)
 *   attacking → chasing   (사거리 이탈)
 *   chasing   → return    (타겟 소실 또는 leash 초과)
 *   return    → idle      (스폰 위치 복귀 완료)
 *
 * ⚠️ 1차: 복잡한 길찾기 없음, 직선 이동만 구현
 */

import { MonsterInstance } from '../../types/monster.js';
import { getPlayer } from '../player/playerStateStore.js';
import { findNearestTarget, isTargetStillValid } from './monsterTargetService.js';
import { setMonster } from './monsterInstanceStore.js';
import { haversineM, moveToward } from '../../lib/geo.js';
import { now } from '../../lib/time.js';

const ARRIVE_THRESHOLD_M = 3; // 이 거리 이하면 도착으로 간주

/** tick마다 한 마리 AI 처리 */
export function tickMonsterAi(monster: MonsterInstance, deltaMs: number): MonsterInstance {
  if (monster.state === 'dead' || monster.state === 'respawning') return monster;

  const m = { ...monster };
  const stepM = (m.moveSpeed * deltaMs) / 1000;

  switch (m.state) {
    case 'idle':
      return tickIdle(m, stepM);
    case 'chasing':
      return tickChasing(m, stepM);
    case 'attacking':
      return tickAttacking(m);
    case 'return':
      return tickReturn(m, stepM);
  }

  return m;
}

function tickIdle(m: MonsterInstance, stepM: number): MonsterInstance {
  // 주변 플레이어 탐색
  const targetId = findNearestTarget(m);
  if (targetId) {
    m.targetUserId = targetId;
    m.state = 'chasing';
    return m;
  }
  return m;
}

function tickChasing(m: MonsterInstance, stepM: number): MonsterInstance {
  // 타겟 유효성 재확인
  if (!isTargetStillValid(m)) {
    m.targetUserId = null;
    m.state = 'return';
    return m;
  }

  const target = getPlayer(m.targetUserId!);
  if (!target) { m.targetUserId = null; m.state = 'return'; return m; }

  const dist = haversineM(m.currentLat, m.currentLng, target.lat, target.lng);

  // 공격 사거리 진입
  if (dist <= m.attackRangeM) {
    m.state = 'attacking';
    return m;
  }

  // 직선 이동
  const moved = moveToward(m.currentLat, m.currentLng, target.lat, target.lng, stepM);
  m.currentLat = moved.lat;
  m.currentLng = moved.lng;

  return m;
}

function tickAttacking(m: MonsterInstance): MonsterInstance {
  // 사거리 이탈 확인
  if (!isTargetStillValid(m)) {
    m.targetUserId = null;
    m.state = 'return';
    return m;
  }

  const target = getPlayer(m.targetUserId!);
  if (!target) { m.targetUserId = null; m.state = 'return'; return m; }

  const dist = haversineM(m.currentLat, m.currentLng, target.lat, target.lng);
  if (dist > m.attackRangeM) {
    m.state = 'chasing';
  }
  // 실제 공격 판정은 CombatResolver에서 처리

  return m;
}

function tickReturn(m: MonsterInstance, stepM: number): MonsterInstance {
  const dist = haversineM(m.currentLat, m.currentLng, m.spawnLat, m.spawnLng);

  if (dist <= ARRIVE_THRESHOLD_M) {
    // 복귀 완료
    m.currentLat = m.spawnLat;
    m.currentLng = m.spawnLng;
    m.state = 'idle';
    return m;
  }

  // 스폰 위치로 이동
  const moved = moveToward(m.currentLat, m.currentLng, m.spawnLat, m.spawnLng, stepM);
  m.currentLat = moved.lat;
  m.currentLng = moved.lng;

  // 복귀 중에도 어그로 체크
  const targetId = findNearestTarget(m);
  if (targetId) {
    m.targetUserId = targetId;
    m.state = 'chasing';
  }

  return m;
}
