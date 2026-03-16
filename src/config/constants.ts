/**
 * config/constants.ts
 * 게임 서버 상수 정의
 *
 * 1차 목표: 안정성 우선 → tick 1초, 복잡한 이동 없음
 */

/** 기본 World tick 주기 (ms) — 1초 */
export const DEFAULT_TICK_MS = 1000;

/** 플레이어가 없을 때의 경량 tick 주기 (ms) */
export const IDLE_TICK_MS = 5000;

/** 플레이어 세션 타임아웃 (ms) — 30초 위치 업데이트 없으면 퇴장 처리 */
export const PLAYER_TIMEOUT_MS = 30_000;

/** 몬스터가 추격 포기하고 복귀하는 최대 거리 (스폰 기준 미터) */
export const MONSTER_LEASH_M = 200;

/** 리스폰 후 전투 유예 시간 (ms) */
export const NON_COMBAT_AFTER_RESPAWN_MS = 2000;

/** 드랍 아이템 소멸 시간 (ms) — 5분 */
export const DROP_EXPIRE_MS = 5 * 60 * 1000;

/** GPS accuracy 신뢰 한계 (미터). 이 이상이면 전투 판정 제외 */
export const MAX_TRUST_ACCURACY_M = 100;

/** 플레이어 기본 레벨당 HP */
export const HP_PER_LEVEL = 1000;

/** 플레이어 기본 레벨당 MP */
export const MP_PER_LEVEL = 1000;
