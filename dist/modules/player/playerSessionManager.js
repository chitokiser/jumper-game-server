"use strict";
/**
 * modules/player/playerSessionManager.ts
 * 플레이어 세션 관리 — 입장/퇴장/위치 업데이트/타임아웃/부활
 *
 * 설계 원칙:
 * - 위치는 클라이언트가 보고하되 accuracy로 신뢰도 보정
 * - 30초간 업데이트 없으면 자동 퇴장
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinZone = joinZone;
exports.updateLocation = updateLocation;
exports.leaveZone = leaveZone;
exports.revivePlayer = revivePlayer;
exports.sweepTimedOutPlayers = sweepTimedOutPlayers;
const playerStateStore_js_1 = require("./playerStateStore.js");
const zoneManager_js_1 = require("../zone/zoneManager.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const monsterInstanceStore_js_1 = require("../monster/monsterInstanceStore.js");
const playerResolver_js_1 = require("./playerResolver.js");
const constants_js_1 = require("../../config/constants.js");
const logger_js_1 = require("../../lib/logger.js");
const time_js_1 = require("../../lib/time.js");
/** 플레이어 입장 */
function joinZone(socketId, data) {
    const { userId, lat, lng, accuracy, level } = data;
    // zone 유효성 검사: 존재 여부 + 좌표 범위 → 필요 시 가장 가까운 존으로 재배정
    const zoneId = (0, zoneManager_js_1.resolveZoneId)(data.zoneId, lat, lng) ?? data.zoneId;
    // 이미 다른 존에 있으면 퇴장 처리
    const existing = (0, playerStateStore_js_1.getPlayer)(userId);
    if (existing && existing.zoneId !== zoneId) {
        (0, zoneManager_js_1.playerLeaveZone)(userId, existing.zoneId);
    }
    const maxHp = level * constants_js_1.HP_PER_LEVEL;
    const maxMp = level * constants_js_1.MP_PER_LEVEL;
    const state = {
        userId, zoneId, lat, lng, accuracy,
        hp: existing?.hp ?? maxHp,
        maxHp,
        mp: existing?.mp ?? maxMp,
        maxMp,
        level,
        state: existing?.state === 'dead' ? 'dead' : 'alive', // 사망 상태 유지
        lastSeenAt: (0, time_js_1.now)(),
        lastMoveAt: (0, time_js_1.now)(),
        lastAttackedAt: 0,
    };
    (0, playerStateStore_js_1.setPlayer)(state);
    (0, playerStateStore_js_1.bindSocket)(socketId, userId);
    (0, zoneManager_js_1.playerEnterZone)(userId, zoneId);
    // 접속 직후 존 스냅샷 전송
    const monsters = (0, monsterInstanceStore_js_1.getMonstersByZone)(zoneId);
    (0, clientSyncService_js_1.sendZoneSnapshot)(socketId, zoneId, monsters);
    logger_js_1.logger.info('playerSession', `${userId} joined zone ${zoneId}`);
}
/** 위치 업데이트 (순간이동 감지 시 1회 보류) */
function updateLocation(socketId, data) {
    const userId = (0, playerStateStore_js_1.getUserIdBySocket)(socketId);
    if (!userId)
        return;
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player)
        return;
    // 순간이동 감지: 위치 무시, lastSeenAt만 갱신
    const elapsed = (0, time_js_1.now)() - player.lastMoveAt;
    if ((0, playerResolver_js_1.isTeleport)({ lat: player.lat, lng: player.lng }, data, elapsed)) {
        logger_js_1.logger.debug('playerSession', `${userId}: teleport ignored (${Math.round(elapsed)}ms, acc=${data.accuracy}m)`);
        (0, playerStateStore_js_1.updatePlayerSeenAt)(userId);
        return;
    }
    (0, playerStateStore_js_1.updatePlayerLocation)(userId, data.lat, data.lng, data.accuracy);
}
/** 퇴장 */
function leaveZone(socketId) {
    const userId = (0, playerStateStore_js_1.unbindSocket)(socketId);
    if (!userId)
        return;
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (player) {
        (0, zoneManager_js_1.playerLeaveZone)(userId, player.zoneId);
        (0, playerStateStore_js_1.removePlayer)(userId);
        logger_js_1.logger.info('playerSession', `${userId} left zone ${player.zoneId}`);
    }
}
/**
 * 부활 처리 — C2S player:revive 수신 시 호출
 * dead 상태 플레이어를 alive로 전환, HP 30% 복구
 */
function revivePlayer(socketId) {
    const userId = (0, playerStateStore_js_1.getUserIdBySocket)(socketId);
    if (!userId)
        return;
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player || player.state !== 'dead')
        return;
    const revivedHp = Math.max(1, Math.floor(player.maxHp * 0.3));
    const updated = {
        ...player,
        hp: revivedHp,
        state: 'alive',
        lastSeenAt: (0, time_js_1.now)(),
    };
    (0, playerStateStore_js_1.setPlayer)(updated);
    (0, clientSyncService_js_1.sendPlayerRevived)(socketId, revivedHp);
    logger_js_1.logger.info('playerSession', `${userId} revived (hp=${revivedHp})`);
}
/** 타임아웃된 플레이어 정리 (WorldEngine tick에서 호출) */
function sweepTimedOutPlayers() {
    const t = (0, time_js_1.now)();
    const timedOut = [];
    for (const player of (0, playerStateStore_js_1.getAllPlayers)()) {
        if (t - player.lastSeenAt > constants_js_1.PLAYER_TIMEOUT_MS) {
            (0, zoneManager_js_1.playerLeaveZone)(player.userId, player.zoneId);
            (0, playerStateStore_js_1.removePlayer)(player.userId);
            timedOut.push(player.userId);
            logger_js_1.logger.info('playerSession', `timeout: ${player.userId} (no update for ${constants_js_1.PLAYER_TIMEOUT_MS}ms)`);
        }
    }
    return timedOut;
}
