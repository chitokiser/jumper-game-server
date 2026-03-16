"use strict";
/**
 * modules/zone/zoneManager.ts
 * 존 관리자 — 존 활성화/비활성화, 플레이어 입퇴장 처리
 *
 * 설계 원칙:
 * - 플레이어가 한 명도 없는 존은 풀 tick 스킵 (리스폰만 수행)
 * - 플레이어가 들어오면 즉시 활성화
 * - joinZone 시 zoneId 존재 여부 + 좌표 범위 검사
 * - 범위 밖이면 가장 가까운 존으로 재배정
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerEnterZone = playerEnterZone;
exports.playerLeaveZone = playerLeaveZone;
exports.isZoneActive = isZoneActive;
exports.getActiveZones = getActiveZones;
exports.getZonePlayers = getZonePlayers;
exports.resolveZoneId = resolveZoneId;
exports.findNearestZone = findNearestZone;
const zoneRegistry_js_1 = require("./zoneRegistry.js");
const zoneState_js_1 = require("./zoneState.js");
const geo_js_1 = require("../../lib/geo.js");
const logger_js_1 = require("../../lib/logger.js");
/** 플레이어 입장 */
function playerEnterZone(userId, zoneId) {
    (0, zoneState_js_1.addPlayerToZone)(zoneId, userId);
    logger_js_1.logger.debug('zoneManager', `${userId} entered zone ${zoneId}`);
}
/** 플레이어 퇴장 */
function playerLeaveZone(userId, zoneId) {
    (0, zoneState_js_1.removePlayerFromZone)(zoneId, userId);
    logger_js_1.logger.debug('zoneManager', `${userId} left zone ${zoneId}`);
}
/** 해당 존에 플레이어가 있는지 */
function isZoneActive(zoneId) {
    return (0, zoneState_js_1.hasPlayers)(zoneId);
}
/** 활성 존 목록 (설정상 active=true인 것) */
function getActiveZones() {
    return (0, zoneRegistry_js_1.getActiveZoneConfigs)().map(z => z.zoneId);
}
/** 존 내 플레이어 목록 */
function getZonePlayers(zoneId) {
    return (0, zoneState_js_1.getPlayersInZone)(zoneId);
}
/**
 * 요청한 zoneId가 유효한지 확인
 * - zoneId가 registry에 존재하고 active인가
 * - 플레이어 좌표가 zone 반경 안인가 (좌표 제공 시)
 * @returns 유효하면 zoneId, 아니면 null
 */
function resolveZoneId(requestedZoneId, lat, lng) {
    const config = (0, zoneRegistry_js_1.getZoneConfig)(requestedZoneId);
    if (!config || !config.active)
        return null;
    // 좌표가 없으면 zoneId 존재 여부만 확인
    if (lat === undefined || lng === undefined)
        return requestedZoneId;
    const dist = (0, geo_js_1.haversineM)(lat, lng, config.centerLat, config.centerLng);
    if (dist <= config.radiusM)
        return requestedZoneId;
    // 범위 밖이면 가장 가까운 존으로 재배정
    const nearest = findNearestZone(lat, lng);
    if (nearest) {
        logger_js_1.logger.debug('zoneManager', `${requestedZoneId} rejected (dist=${Math.round(dist)}m), reassigned to ${nearest}`);
        return nearest;
    }
    return null;
}
/**
 * 좌표 기준 가장 가까운 활성 존 반환
 * 모든 활성 존에서 중심 거리가 가장 짧은 것을 선택
 */
function findNearestZone(lat, lng) {
    const zones = (0, zoneRegistry_js_1.getActiveZoneConfigs)();
    let nearest = null;
    let minDist = Infinity;
    for (const zone of zones) {
        const dist = (0, geo_js_1.haversineM)(lat, lng, zone.centerLat, zone.centerLng);
        if (dist < minDist) {
            minDist = dist;
            nearest = zone.zoneId;
        }
    }
    return nearest;
}
