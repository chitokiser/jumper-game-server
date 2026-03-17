"use strict";
/**
 * modules/admin/spawnConfigLoader.ts
 * 스폰 설정 로더
 *
 * - 기본 스폰: defaultWorldData.ts (서버 기동 시 로드)
 * - admin 스폰: Firestore gs_admin_spawns 컬렉션에 영구 저장
 *   → 서버 재시작 후 loadAdminSpawnsFromFirestore() 로 복원
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSpawnConfig = loadSpawnConfig;
exports.getSpawnConfig = getSpawnConfig;
exports.getAllSpawnConfigs = getAllSpawnConfigs;
exports.getLoadedZoneConfigs = getLoadedZoneConfigs;
exports.addSpawnConfig = addSpawnConfig;
exports.loadAdminSpawnsFromFirestore = loadAdminSpawnsFromFirestore;
exports.removeSpawnConfig = removeSpawnConfig;
const logger_js_1 = require("../../lib/logger.js");
const firebaseAdmin_js_1 = require("../../lib/firebaseAdmin.js");
const FS_COLLECTION = 'gs_admin_spawns';
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
/** 런타임에 스폰 포인트 추가 (관리자 배치) + Firestore 영구 저장 */
function addSpawnConfig(spawn) {
    spawnMap.set(spawn.spawnId, spawn);
    logger_js_1.logger.info('spawnLoader', `[admin] added spawn ${spawn.spawnId} (${spawn.monsterType} @ zone ${spawn.zoneId})`);
    const db = (0, firebaseAdmin_js_1.getFirestore)();
    if (db) {
        db.collection(FS_COLLECTION).doc(spawn.spawnId).set(spawn)
            .catch(err => logger_js_1.logger.warn('spawnLoader', `Firestore save failed: ${err.message}`));
    }
}
/** 서버 시작 시 Firestore에서 admin 스폰 복원 */
async function loadAdminSpawnsFromFirestore() {
    const db = (0, firebaseAdmin_js_1.getFirestore)();
    if (!db)
        return 0;
    try {
        const snap = await db.collection(FS_COLLECTION).get();
        let count = 0;
        for (const doc of snap.docs) {
            const spawn = doc.data();
            if (!spawnMap.has(spawn.spawnId)) {
                spawnMap.set(spawn.spawnId, spawn);
                count++;
            }
        }
        if (count > 0)
            logger_js_1.logger.info('spawnLoader', `Firestore에서 admin 스폰 ${count}개 복원`);
        return count;
    }
    catch (err) {
        logger_js_1.logger.warn('spawnLoader', `Firestore 스폰 복원 실패: ${err.message}`);
        return 0;
    }
}
/** 런타임에 스폰 포인트 제거 (관리자 삭제) + Firestore 삭제 */
function removeSpawnConfig(spawnId) {
    const spawn = spawnMap.get(spawnId);
    spawnMap.delete(spawnId);
    if (spawn) {
        logger_js_1.logger.info('spawnLoader', `[admin] removed spawn ${spawnId}`);
        const db = (0, firebaseAdmin_js_1.getFirestore)();
        if (db) {
            db.collection(FS_COLLECTION).doc(spawnId).delete()
                .catch(err => logger_js_1.logger.warn('spawnLoader', `Firestore delete failed: ${err.message}`));
        }
    }
    return spawn;
}
