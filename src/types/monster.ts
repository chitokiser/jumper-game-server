/**
 * types/monster.ts
 * 몬스터 관련 타입 정의
 *
 * ⚠️ 핵심 원칙: SpawnPoint ≠ Instance
 * - MonsterSpawnPoint : 설정 데이터 (운영자가 수정, 변하지 않음)
 * - MonsterInstance   : 런타임 객체 (서버가 실시간 관리)
 *
 * 상태 머신:
 *   idle → chasing → attacking
 *   attacking → chasing (사거리 이탈)
 *   chasing → return (타겟 소실)
 *   return → idle (복귀 완료)
 *   any → dead → respawning → idle
 */

export type MonsterStateEnum =
  | 'idle'
  | 'chasing'
  | 'attacking'
  | 'return'
  | 'dead'
  | 'respawning';

/** 설정 데이터 — 운영자가 정의, 서버 기동 시 로드 */
export interface MonsterSpawnPoint {
  spawnId: string;
  zoneId: string;
  /** 몬스터 종류 식별자 (예: "goblin", "orc") */
  monsterType: string;
  lat: number;
  lng: number;
  /** 리스폰 대기 시간 (초) */
  respawnSeconds: number;
  /** 이 스폰 포인트에서 유지할 최대 인스턴스 수 */
  maxCount: number;
  active: boolean;
  /** 어그로 감지 반경 (미터) */
  aggroRangeM: number;
  /** 공격 사거리 (미터) */
  attackRangeM: number;
  /** 이동 속도 (m/s) */
  moveSpeed: number;
  attackPower: number;
  /** 공격 쿨다운 (ms) */
  attackCooldownMs: number;
  maxHp: number;
}

/** 런타임 객체 — 서버가 실시간 관리 */
export interface MonsterInstance {
  monsterId: string;
  zoneId: string;
  /** 어떤 SpawnPoint에서 태어났는지 */
  spawnId: string;
  type: string;

  /** 스폰 원위치 (복귀/리스폰 기준) */
  spawnLat: number;
  spawnLng: number;
  /** 현재 위치 (AI 이동 후 갱신) */
  currentLat: number;
  currentLng: number;

  hp: number;
  maxHp: number;
  state: MonsterStateEnum;

  /** 현재 추적/공격 중인 플레이어 userId */
  targetUserId: string | null;

  aggroRangeM: number;
  attackRangeM: number;
  moveSpeed: number;
  attackPower: number;
  attackCooldownMs: number;

  /** 사망 시각 (null = 살아있음) */
  deadAt: number | null;
  /** 리스폰 예정 시각 (null = 살아있음) */
  respawnAt: number | null;
  /** 마지막 행동(공격) 시각 */
  lastActionAt: number;
  /** 리스폰 직후 전투 유예 시각 (nonCombatUntil 이전엔 공격 안 함) */
  nonCombatUntil: number;
}
