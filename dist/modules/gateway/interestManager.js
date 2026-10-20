"use strict";
/**
 * modules/gateway/interestManager.ts
 * 플레이어별 "보이는 몬스터" 관리 — 내 주변 VIEW_RADIUS_M 안의 몬스터만 보낸다
 *
 * 배경 (2026-10-20): 존 하나에 몬스터가 수백~수천 마리 몰리면(약물상점 스폰)
 * 매 tick 존 전체를 모든 플레이어에게 보내 휴대폰이 버벅였다.
 *
 * - 스냅샷: 접속 위치 기준 반경 안의 몬스터만
 * - tick: 반경 안에서 (바뀐 몬스터 + 새로 반경에 들어온 몬스터)만 그 플레이어에게 전송
 * - 반경 밖으로 나간 몬스터는 클라이언트가 거리로 직접 지운다 (별도 이벤트 없음)
 * - 사망·리스폰·피격 단건 이벤트는 기존처럼 존 전체 전송 (작음)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEW_RADIUS_M = void 0;
exports.visibleMonsters = visibleMonsters;
exports.resetKnown = resetKnown;
exports.forgetPlayer = forgetPlayer;
exports.syncZoneToPlayers = syncZoneToPlayers;
const geo_js_1 = require("../../lib/geo.js");
const socketGateway_js_1 = require("./socketGateway.js");
const eventNames_js_1 = require("./eventNames.js");
exports.VIEW_RADIUS_M = 300;
/** userId → 마지막으로 보낸 '보이는 몬스터' ID */
const _known = new Map();
function visibleMonsters(lat, lng, monsters) {
    return monsters.filter(m => (0, geo_js_1.haversineM)(lat, lng, m.currentLat, m.currentLng) <= exports.VIEW_RADIUS_M);
}
/** 스냅샷 전송 직후 호출 — 보낸 목록을 기억 */
function resetKnown(userId, monsters) {
    _known.set(userId, new Set(monsters.map(m => m.monsterId)));
}
function forgetPlayer(userId) {
    _known.delete(userId);
}
/** tick마다: 플레이어별로 필요한 몬스터만 전송 */
function syncZoneToPlayers(players, monsters, changedIds) {
    for (const p of players) {
        const socketId = (0, socketGateway_js_1.getSocketId)(p.userId);
        if (!socketId)
            continue;
        const known = _known.get(p.userId) ?? new Set();
        const visible = visibleMonsters(p.lat, p.lng, monsters);
        const send = visible.filter(m => changedIds.has(m.monsterId) || !known.has(m.monsterId));
        _known.set(p.userId, new Set(visible.map(m => m.monsterId)));
        if (send.length > 0)
            (0, socketGateway_js_1.emitToSocket)(socketId, eventNames_js_1.S2C.MONSTER_BATCH_UPDATE, send);
    }
}
