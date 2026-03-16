"use strict";
/**
 * modules/gateway/clientSyncService.ts
 * 클라이언트 동기화 서비스
 *
 * - 접속 직후 존 전체 스냅샷 전송
 * - 몬스터/플레이어 상태 변경 시 이벤트 push
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendZoneSnapshot = sendZoneSnapshot;
exports.broadcastMonsterUpdate = broadcastMonsterUpdate;
exports.broadcastMonsterDied = broadcastMonsterDied;
exports.broadcastMonsterRespawned = broadcastMonsterRespawned;
exports.sendPlayerHit = sendPlayerHit;
exports.sendPlayerDied = sendPlayerDied;
exports.sendPlayerRevived = sendPlayerRevived;
exports.broadcastDropSpawned = broadcastDropSpawned;
const socketGateway_js_1 = require("./socketGateway.js");
const eventNames_js_1 = require("./eventNames.js");
const dropStore_js_1 = require("../drop/dropStore.js");
/** 존 전체 스냅샷 전송 (접속 직후 1회)
 * 포함: monsters, drops(미수집), serverTime
 */
function sendZoneSnapshot(socketId, zoneId, monsters) {
    const drops = (0, dropStore_js_1.getDropsByZone)(zoneId);
    (0, socketGateway_js_1.emitToSocket)(socketId, eventNames_js_1.S2C.ZONE_SNAPSHOT, {
        zoneId,
        monsters,
        drops,
        serverTime: Date.now(),
    });
}
/** 몬스터 상태 변경 브로드캐스트 */
function broadcastMonsterUpdate(zoneId, monster) {
    (0, socketGateway_js_1.emitToZone)(zoneId, eventNames_js_1.S2C.MONSTER_UPDATE, monster);
}
/** 몬스터 사망 브로드캐스트 */
function broadcastMonsterDied(zoneId, monsterId) {
    (0, socketGateway_js_1.emitToZone)(zoneId, eventNames_js_1.S2C.MONSTER_DIED, { monsterId });
}
/** 몬스터 리스폰 브로드캐스트 */
function broadcastMonsterRespawned(zoneId, monster) {
    (0, socketGateway_js_1.emitToZone)(zoneId, eventNames_js_1.S2C.MONSTER_RESPAWNED, monster);
}
/** 플레이어 피격 (해당 유저에게만) */
function sendPlayerHit(socketId, damage, remainHp, monsterId) {
    (0, socketGateway_js_1.emitToSocket)(socketId, eventNames_js_1.S2C.PLAYER_HIT, { damage, remainHp, monsterId });
}
/** 플레이어 사망 */
function sendPlayerDied(socketId) {
    (0, socketGateway_js_1.emitToSocket)(socketId, eventNames_js_1.S2C.PLAYER_DIED, {});
}
/** 플레이어 부활 완료 (해당 유저에게만) */
function sendPlayerRevived(socketId, hp) {
    (0, socketGateway_js_1.emitToSocket)(socketId, eventNames_js_1.S2C.PLAYER_REVIVED, { hp });
}
/** 드랍 생성 브로드캐스트 */
function broadcastDropSpawned(zoneId, drop) {
    (0, socketGateway_js_1.emitToZone)(zoneId, eventNames_js_1.S2C.DROP_SPAWNED, drop);
}
