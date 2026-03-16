"use strict";
/**
 * modules/monster/monsterSpawnService.ts
 * 몬스터 스폰 서비스
 *
 * - SpawnPoint 설정을 읽어 초기 MonsterInstance 생성
 * - maxCount 유지 (부족하면 즉시 생성)
 * - SpawnPoint ≠ Instance 원칙 엄수
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillSpawnPoint = fillSpawnPoint;
exports.initAllSpawns = initAllSpawns;
const uuid_1 = require("uuid");
const monsterInstanceStore_js_1 = require("./monsterInstanceStore.js");
const time_js_1 = require("../../lib/time.js");
const logger_js_1 = require("../../lib/logger.js");
/** SpawnPoint에서 MonsterInstance 1개 생성 */
function createInstance(spawn) {
    return {
        monsterId: (0, uuid_1.v4)(),
        zoneId: spawn.zoneId,
        spawnId: spawn.spawnId,
        type: spawn.monsterType,
        spawnLat: spawn.lat,
        spawnLng: spawn.lng,
        currentLat: spawn.lat,
        currentLng: spawn.lng,
        hp: spawn.maxHp,
        maxHp: spawn.maxHp,
        state: 'idle',
        targetUserId: null,
        aggroRangeM: spawn.aggroRangeM,
        attackRangeM: spawn.attackRangeM,
        moveSpeed: spawn.moveSpeed,
        attackPower: spawn.attackPower,
        attackCooldownMs: spawn.attackCooldownMs,
        deadAt: null,
        respawnAt: null,
        lastActionAt: (0, time_js_1.now)(),
        nonCombatUntil: 0,
    };
}
/**
 * SpawnPoint의 maxCount를 채울 때까지 인스턴스 생성
 * 서버 시작 또는 주기적 검사 시 호출
 */
function fillSpawnPoint(spawn) {
    if (!spawn.active)
        return 0;
    const alive = (0, monsterInstanceStore_js_1.countAliveBySpawn)(spawn.spawnId);
    const toCreate = spawn.maxCount - alive;
    for (let i = 0; i < toCreate; i++) {
        const instance = createInstance(spawn);
        (0, monsterInstanceStore_js_1.setMonster)(instance);
        logger_js_1.logger.debug('monsterSpawn', `spawned ${instance.type} [${instance.monsterId.slice(0, 8)}] at zone ${spawn.zoneId}`);
    }
    return toCreate;
}
/** 전체 SpawnPoint 배열로 초기화 */
function initAllSpawns(spawns) {
    let total = 0;
    for (const spawn of spawns) {
        total += fillSpawnPoint(spawn);
    }
    logger_js_1.logger.info('monsterSpawn', `initial spawn complete: ${total} monsters`);
}
