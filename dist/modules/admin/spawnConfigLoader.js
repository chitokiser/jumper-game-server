"use strict";
/**
 * modules/admin/spawnConfigLoader.ts
 * 스폰 설정 로더
 *
 * 1차: JSON 파일 기반 로드 (src/config/spawnData.json)
 * 이후: Firestore 연동으로 확장 가능
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSpawnConfig = loadSpawnConfig;
exports.getSpawnConfig = getSpawnConfig;
exports.getAllSpawnConfigs = getAllSpawnConfigs;
exports.getLoadedZoneConfigs = getLoadedZoneConfigs;
exports.addSpawnConfig = addSpawnConfig;
exports.removeSpawnConfig = removeSpawnConfig;
const logger_js_1 = require("../../lib/logger.js");
/** 로드된 SpawnPoint Map (spawnId → config) */
const spawnMap = new Map();
let zoneConfigs = [];
/** 스폰 데이터 + 존 설정 로드 */
function loadSpawnConfig(data) {
    zoneConfigs = data.zones;
    spawnMap.clear();
    for (const s of data.spawns) {
        spawnMap.set(s.spawnId, s);
    }
    logger_js_1.logger.info('spawnLoader', `loaded ${data.zones.length} zones, ${data.spawns.length} spawn points`);
}
function getSpawnConfig(spawnId) {
    return spawnMap.get(spawnId);
}
function getAllSpawnConfigs() {
    return [...spawnMap.values()];
}
function getLoadedZoneConfigs() {
    return zoneConfigs;
}
/** 런타임에 스폰 포인트 추가 (관리자 배치) */
function addSpawnConfig(spawn) {
    spawnMap.set(spawn.spawnId, spawn);
    logger_js_1.logger.info('spawnLoader', `[admin] added spawn ${spawn.spawnId} (${spawn.monsterType} @ zone ${spawn.zoneId})`);
}
/** 런타임에 스폰 포인트 제거 (관리자 삭제) */
function removeSpawnConfig(spawnId) {
    const spawn = spawnMap.get(spawnId);
    spawnMap.delete(spawnId);
    if (spawn)
        logger_js_1.logger.info('spawnLoader', `[admin] removed spawn ${spawnId}`);
    return spawn;
}
