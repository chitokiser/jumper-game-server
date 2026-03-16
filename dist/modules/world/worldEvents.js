"use strict";
/**
 * modules/world/worldEvents.ts
 * 월드 레벨 이벤트 버스
 *
 * 역할:
 * 1. 전역 이벤트 발행 (Node.js EventEmitter) — 모듈 간 느슨한 결합
 * 2. tick 내 이벤트 임시 수집 버퍼 — tick 종료 후 한 번에 gateway 전송
 *    (1차: 즉시 브로드캐스트 구조이므로 버퍼는 stats/디버그 용도)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_EVENT = exports.worldEvents = void 0;
exports.clearTickBuffer = clearTickBuffer;
exports.pushTickEvent = pushTickEvent;
exports.flushTickBuffer = flushTickBuffer;
exports.tickBufferSize = tickBufferSize;
const events_1 = require("events");
// ── 전역 이벤트 버스 ─────────────────────────────────────────────────────────
exports.worldEvents = new events_1.EventEmitter();
exports.worldEvents.setMaxListeners(50);
exports.WORLD_EVENT = {
    TICK: 'world:tick',
    ZONE_ACTIVATED: 'world:zone:activated',
    ZONE_DEACTIVATED: 'world:zone:deactivated',
    MONSTER_DIED: 'world:monster:died',
    MONSTER_SPAWNED: 'world:monster:spawned',
    PLAYER_DIED: 'world:player:died',
};
let tickBuffer = [];
/** tick 시작 시 버퍼 초기화 */
function clearTickBuffer() {
    tickBuffer = [];
}
/** tick 중 이벤트 수집 */
function pushTickEvent(event) {
    tickBuffer.push(event);
}
/** tick 종료 시 수집된 이벤트 반환 후 초기화 */
function flushTickBuffer() {
    const events = tickBuffer;
    tickBuffer = [];
    return events;
}
/** 현재 tick 버퍼 크기 (통계용) */
function tickBufferSize() {
    return tickBuffer.length;
}
