/**
 * lib/time.ts
 * 시간 관련 유틸리티
 */

/** 현재 Unix 타임스탬프 (ms) */
export function now(): number {
  return Date.now();
}

/** 경과 시간 (ms) */
export function elapsed(since: number): number {
  return Date.now() - since;
}

/** 쿨다운이 끝났는지 확인 */
export function cooldownReady(lastAt: number, cooldownMs: number): boolean {
  return elapsed(lastAt) >= cooldownMs;
}

/** 만료됐는지 확인 */
export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}
