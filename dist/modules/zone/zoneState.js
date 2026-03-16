"use strict";
/**
 * modules/zone/zoneState.ts
 * 존의 런타임 상태 — 현재 접속 중인 플레이어 목록
 *
 * 몬스터 인스턴스는 monsterInstanceStore에서 zoneId로 별도 관리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateZoneState = getOrCreateZoneState;
exports.setLastBroadcastAt = setLastBroadcastAt;
exports.addPlayerToZone = addPlayerToZone;
exports.removePlayerFromZone = removePlayerFromZone;
exports.getPlayersInZone = getPlayersInZone;
exports.hasPlayers = hasPlayers;
exports.setLastTickAt = setLastTickAt;
const states = new Map();
function getOrCreateZoneState(zoneId) {
    if (!states.has(zoneId)) {
        states.set(zoneId, { zoneId, players: new Set(), lastTickAt: 0, lastBroadcastAt: 0 });
    }
    return states.get(zoneId);
}
function setLastBroadcastAt(zoneId, t) {
    const s = states.get(zoneId);
    if (s)
        s.lastBroadcastAt = t;
}
function addPlayerToZone(zoneId, userId) {
    getOrCreateZoneState(zoneId).players.add(userId);
}
function removePlayerFromZone(zoneId, userId) {
    states.get(zoneId)?.players.delete(userId);
}
function getPlayersInZone(zoneId) {
    return [...(states.get(zoneId)?.players ?? [])];
}
function hasPlayers(zoneId) {
    return (states.get(zoneId)?.players.size ?? 0) > 0;
}
function setLastTickAt(zoneId, t) {
    const s = states.get(zoneId);
    if (s)
        s.lastTickAt = t;
}
