"use strict";
/**
 * lib/time.ts
 * 시간 관련 유틸리티
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.now = now;
exports.elapsed = elapsed;
exports.cooldownReady = cooldownReady;
exports.isExpired = isExpired;
/** 현재 Unix 타임스탬프 (ms) */
function now() {
    return Date.now();
}
/** 경과 시간 (ms) */
function elapsed(since) {
    return Date.now() - since;
}
/** 쿨다운이 끝났는지 확인 */
function cooldownReady(lastAt, cooldownMs) {
    return elapsed(lastAt) >= cooldownMs;
}
/** 만료됐는지 확인 */
function isExpired(expiresAt) {
    return Date.now() > expiresAt;
}
