"use strict";
/**
 * modules/zone/zoneRegistry.ts
 * 존 설정 레지스트리 — ZoneConfig 읽기 전용 저장소
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerZone = registerZone;
exports.getZoneConfig = getZoneConfig;
exports.getAllZoneConfigs = getAllZoneConfigs;
exports.getActiveZoneConfigs = getActiveZoneConfigs;
exports.unregisterZone = unregisterZone;
const logger_js_1 = require("../../lib/logger.js");
const registry = new Map();
function registerZone(config) {
    registry.set(config.zoneId, config);
    logger_js_1.logger.info('zoneRegistry', `registered zone: ${config.zoneId} (${config.name})`);
}
function getZoneConfig(zoneId) {
    return registry.get(zoneId);
}
function getAllZoneConfigs() {
    return [...registry.values()];
}
function getActiveZoneConfigs() {
    return [...registry.values()].filter(z => z.active);
}
function unregisterZone(zoneId) {
    registry.delete(zoneId);
}
