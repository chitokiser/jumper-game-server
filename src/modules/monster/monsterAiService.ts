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
/** 몬스터 사망/리스폰 시 순찰 상태 초기화 (외부에서 호출) */
export function clearPatrolState(monsterId: string): void {
  _patrolWaypoints.delete(monsterId);
}
import { haversineM, moveToward } from '../../lib/geo.js';
import { now } from '../../lib/time.js';

const ARRIVE_THRESHOLD_M = 3; // 이 거리 이하면 도착으로 간주

// ── 순찰 웨이포인트 (MonsterInstance 외부 상태) ──────────────────────────────
interface PatrolWaypoint { lat: number; lng: number; setAt: number }
const _patrolWaypoints = new Map<string, PatrolWaypoint>();
/** 웨이포인트 교체 주기 (ms) */
const PATROL_CHANGE_MS = 8_000;

/** 순찰 반경 (m) — aggroRangeM 의 25%, 최대 60m */
function patrolRadius(m: MonsterInstance): number {
  return Math.min(60, m.aggroRangeM * 0.25);
}

/** 스폰 기준 랜덤 오프셋 좌표 생성 */
function randomPatrolPoint(m: MonsterInstance): PatrolWaypoint {
  const r   = Math.random() * patrolRadius(m);
  const ang = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(ang)) / 111_320;
  const dLng = (r * Math.sin(ang)) / (111_320 * Math.cos(m.spawnLat * Math.PI / 180));
  return { lat: m.spawnLat + dLat, lng: m.spawnLng + dLng, setAt: now() };
}

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
  // 주변 플레이어 탐색 — 발견 즉시 추격
  const targetId = findNearestTarget(m);
  if (targetId) {
    m.targetUserId = targetId;
    m.state = 'chasing';
    _patrolWaypoints.delete(m.monsterId);
    return m;
  }

  // 순찰: 주기적으로 랜덤 웨이포인트로 이동
  const nowMs = now();
  let wp = _patrolWaypoints.get(m.monsterId);
  if (!wp || nowMs - wp.setAt >= PATROL_CHANGE_MS) {
    wp = randomPatrolPoint(m);
    _patrolWaypoints.set(m.monsterId, wp);
  }

  const dist = haversineM(m.currentLat, m.currentLng, wp.lat, wp.lng);
  if (dist > ARRIVE_THRESHOLD_M) {
    const moved = moveToward(m.currentLat, m.currentLng, wp.lat, wp.lng, stepM);
    m.currentLat = moved.lat;
    m.currentLng = moved.lng;
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
