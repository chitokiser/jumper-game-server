"use strict";
/**
 * modules/combat/attackCooldownService.ts
 * 공격 쿨다운 추적
 *
 * 몬스터의 lastActionAt을 기반으로 쿨다운 계산
 * (플레이어 → 몬스터 공격도 별도 추적 가능)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPlayerAttack = canPlayerAttack;
exports.recordPlayerAttack = recordPlayerAttack;
exports.canMonsterAttack = canMonsterAttack;
const time_js_1 = require("../../lib/time.js");
/** 플레이어 → 몬스터 공격 쿨다운 (ms) */
const PLAYER_ATTACK_COOLDOWN_MS = 500;
/** userId → 마지막 공격 시각 */
const playerLastAttack = new Map();
function canPlayerAttack(userId) {
    const last = playerLastAttack.get(userId) ?? 0;
    return (0, time_js_1.cooldownReady)(last, PLAYER_ATTACK_COOLDOWN_MS);
}
function recordPlayerAttack(userId) {
    playerLastAttack.set(userId, Date.now());
}
/** 몬스터 공격 쿨다운 확인 */
function canMonsterAttack(lastActionAt, cooldownMs) {
    return (0, time_js_1.cooldownReady)(lastActionAt, cooldownMs);
}
