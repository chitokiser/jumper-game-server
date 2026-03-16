"use strict";
/**
 * lib/geo.ts
 * 위치 기반 계산 유틸리티
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineM = haversineM;
exports.moveToward = moveToward;
exports.isAccuracyTooLow = isAccuracyTooLow;
const EARTH_RADIUS_M = 6371000;
/**
 * 두 좌표 사이의 거리 (미터) — Haversine 공식
 */
function haversineM(lat1, lng1, lat2, lng2) {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
/**
 * 이동 후 새 좌표 계산
 * bearing: 방위각(도), distM: 이동 거리(미터)
 */
function moveToward(fromLat, fromLng, toLat, toLng, distM) {
    const total = haversineM(fromLat, fromLng, toLat, toLng);
    if (total <= distM || total === 0)
        return { lat: toLat, lng: toLng };
    const ratio = distM / total;
    return {
        lat: fromLat + (toLat - fromLat) * ratio,
        lng: fromLng + (toLng - fromLng) * ratio,
    };
}
/**
 * GPS accuracy가 너무 나쁜 좌표인지 확인
 * 기준: 100m 이상이면 신뢰 불가
 */
function isAccuracyTooLow(accuracy) {
    return accuracy > 100;
}
