"use strict";
/**
 * modules/admin/zoneReloadService.ts
 * 존/스폰 설정 핫 리로드 서비스
 *
 * 향후 관리자 API (/admin/reload) 등에서 호출
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadWorld = reloadWorld;
const spawnConfigLoader_js_1 = require("./spawnConfigLoader.js");
const zoneRegistry_js_1 = require("../zone/zoneRegistry.js");
const monsterSpawnService_js_1 = require("../monster/monsterSpawnService.js");
const defaultWorldData_js_1 = require("../../config/defaultWorldData.js");
const logger_js_1 = require("../../lib/logger.js");
async function reloadWorld() {
    logger_js_1.logger.info('zoneReload', 'reloading world config...');
    const data = (0, defaultWorldData_js_1.getDefaultWorldData)();
    (0, spawnConfigLoader_js_1.loadSpawnConfig)(data);
    for (const zone of data.zones) {
        (0, zoneRegistry_js_1.registerZone)(zone);
    }
    (0, monsterSpawnService_js_1.initAllSpawns)(data.spawns);
    logger_js_1.logger.info('zoneReload', 'world reload complete');
}
