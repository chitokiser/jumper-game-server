"use strict";
/**
 * modules/monster/monsterInstanceStore.ts
 * 몬스터 인스턴스 인메모리 저장소
 *
 * ⚠️ 이 저장소는 런타임 전용 — 서버 재시작 시 초기화됨
 *    영속성이 필요하면 별도 DB 연동 필요 (1차에서는 메모리 운영)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMonster = setMonster;
exports.getMonster = getMonster;
exports.removeMonster = removeMonster;
exports.getAllMonsters = getAllMonsters;
exports.getMonstersByZone = getMonstersByZone;
exports.countAliveBySpawn = countAliveBySpawn;
exports.getDeadMonsters = getDeadMonsters;
exports.getMonstersBySpawn = getMonstersBySpawn;
exports.removeMonstersBySpawn = removeMonstersBySpawn;
/** monsterId → MonsterInstance */
const store = new Map();
function setMonster(m) {
    store.set(m.monsterId, m);
}
function getMonster(monsterId) {
    return store.get(monsterId);
}
function removeMonster(monsterId) {
    store.delete(monsterId);
}
function getAllMonsters() {
    return [...store.values()];
}
function getMonstersByZone(zoneId) {
    return [...store.values()].filter(m => m.zoneId === zoneId);
}
/** 특정 SpawnPoint에서 생성된 살아있는 인스턴스 수 */
function countAliveBySpawn(spawnId) {
    return [...store.values()].filter(m => m.spawnId === spawnId && m.state !== 'dead' && m.state !== 'respawning').length;
}
/** 죽은 몬스터 중 리스폰 대기 중인 것들 */
function getDeadMonsters() {
    return [...store.values()].filter(m => m.state === 'dead' || m.state === 'respawning');
}
/** 특정 SpawnPoint의 모든 인스턴스 반환 */
function getMonstersBySpawn(spawnId) {
    return [...store.values()].filter(m => m.spawnId === spawnId);
}
/** 특정 SpawnPoint의 모든 인스턴스 제거 후 제거된 monsterId 목록 반환 */
function removeMonstersBySpawn(spawnId) {
    const ids = [...store.values()]
        .filter(m => m.spawnId === spawnId)
        .map(m => m.monsterId);
    ids.forEach(id => store.delete(id));
    return ids;
}
