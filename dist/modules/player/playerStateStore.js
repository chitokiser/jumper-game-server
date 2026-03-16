"use strict";
/**
 * modules/player/playerStateStore.ts
 * 플레이어 실시간 상태 인메모리 저장소
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPlayer = setPlayer;
exports.getPlayer = getPlayer;
exports.removePlayer = removePlayer;
exports.getAllPlayers = getAllPlayers;
exports.getPlayersInZone = getPlayersInZone;
exports.updatePlayerLocation = updatePlayerLocation;
exports.updatePlayerSeenAt = updatePlayerSeenAt;
exports.bindSocket = bindSocket;
exports.unbindSocket = unbindSocket;
exports.getUserIdBySocket = getUserIdBySocket;
/** userId → PlayerState */
const store = new Map();
/** socketId → userId (세션 관리용) */
const socketToUser = new Map();
function setPlayer(state) {
    store.set(state.userId, state);
}
function getPlayer(userId) {
    return store.get(userId);
}
function removePlayer(userId) {
    store.delete(userId);
}
function getAllPlayers() {
    return [...store.values()];
}
function getPlayersInZone(zoneId) {
    return [...store.values()].filter(p => p.zoneId === zoneId);
}
function updatePlayerLocation(userId, lat, lng, accuracy) {
    const p = store.get(userId);
    if (!p)
        return;
    p.lat = lat;
    p.lng = lng;
    p.accuracy = accuracy;
    p.lastSeenAt = Date.now();
    p.lastMoveAt = Date.now();
}
/**
 * 순간이동 감지 시: 위치는 무시하고 lastSeenAt만 갱신
 * (타임아웃 방지 + 위치 보류)
 */
function updatePlayerSeenAt(userId) {
    const p = store.get(userId);
    if (!p)
        return;
    p.lastSeenAt = Date.now();
}
/** socketId 바인딩 */
function bindSocket(socketId, userId) {
    socketToUser.set(socketId, userId);
}
function unbindSocket(socketId) {
    const uid = socketToUser.get(socketId);
    socketToUser.delete(socketId);
    return uid;
}
function getUserIdBySocket(socketId) {
    return socketToUser.get(socketId);
}
