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

/** GPS accuracy 신뢰 한계 (미터). 이 이상이면 전투(피해 확정) 판정 제외 */
export const MAX_TRUST_ACCURACY_M = 100;

/**
 * GPS 오차 대응 상수
 */

/** 타겟 선정 시 허용 accuracy 한계 (미터) — 전투 판정(100m)보다 엄격 */
export const AGGRO_MAX_ACCURACY_M = 30;

/** 어그로 해제 거리 배수 (히스테리시스)
 * 시작: aggroRangeM 안에 들어오면 어그로
 * 해제: aggroRangeM * AGGRO_RELEASE_MULTIPLIER 밖으로 벗어나야 해제
 * 예: aggroRange=25m → 35m 이상 벗어나야 해제
 */
export const AGGRO_RELEASE_MULTIPLIER = 1.4;

/** 타겟 선정 시 위치 스탈 한계 (ms) — 이 이상 갱신 없으면 타겟 제외 */
export const TARGETING_MAX_STALE_MS = 10_000;

/** 순간이동 판정 최대 속도 (m/s) — 이 이상이면 GPS 오류 이동으로 간주
 * 15 m/s ≈ 54 km/h (도보/뛰기 범위를 크게 초과)
 */
export const MAX_REASONABLE_SPEED_MS = 15;

/** 순간이동 판정 최소 거리 (미터) — 이 미만은 GPS drift 허용 */
export const MIN_TELEPORT_DIST_M = 40;

/** 플레이어 기본 레벨당 HP */
export const HP_PER_LEVEL = 1000;

/** 플레이어 기본 레벨당 MP */
export const MP_PER_LEVEL = 1000;

/** 소켓 disconnect 후 재접속 유예 시간 (ms) — 이 안에 reconnect하면 세션 유지 */
export const DISCONNECT_GRACE_MS = 10_000;

/** sweepTimedOutPlayers 호출 주기 (tick 수 기준) */
export const PLAYER_SWEEP_EVERY = 30;
