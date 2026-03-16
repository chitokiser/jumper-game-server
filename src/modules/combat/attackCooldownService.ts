/**
 * modules/combat/attackCooldownService.ts
 * 공격 쿨다운 추적
 *
 * 몬스터의 lastActionAt을 기반으로 쿨다운 계산
 * (플레이어 → 몬스터 공격도 별도 추적 가능)
 */

import { cooldownReady } from '../../lib/time.js';

/** 플레이어 → 몬스터 공격 쿨다운 (ms) */
const PLAYER_ATTACK_COOLDOWN_MS = 500;

/** userId → 마지막 공격 시각 */
const playerLastAttack = new Map<string, number>();

export function canPlayerAttack(userId: string): boolean {
  const last = playerLastAttack.get(userId) ?? 0;
  return cooldownReady(last, PLAYER_ATTACK_COOLDOWN_MS);
}

export function recordPlayerAttack(userId: string): void {
  playerLastAttack.set(userId, Date.now());
}

/** 몬스터 공격 쿨다운 확인 */
export function canMonsterAttack(lastActionAt: number, cooldownMs: number): boolean {
  return cooldownReady(lastActionAt, cooldownMs);
}
