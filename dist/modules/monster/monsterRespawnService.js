"use strict";
/**
 * modules/monster/monsterRespawnService.ts
 * 몬스터 리스폰 서비스 — 1차 핵심 기능
 *
 * 원칙: 몬스터는 죽어도 삭제하지 않는다
 *
 * 상태 흐름:
 *   hp <= 0  → state=dead, deadAt=now, respawnAt=now+respawnSeconds*1000
 *   respawnAt 도달 → state=respawning, hp/위치 초기화, nonCombatUntil=now+NON_COMBAT
 *   nonCombatUntil 도달 → state=idle (전투 참여 가능)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsDead = markAsDead;
exports.tickRespawn = tickRespawn;
const monsterInstanceStore_js_1 = require("./monsterInstanceStore.js");
const monsterAiService_js_1 = require("./monsterAiService.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const time_js_1 = require("../../lib/time.js");
const constants_js_1 = require("../../config/constants.js");
const logger_js_1 = require("../../lib/logger.js");
/**
 * 사망 처리 — hp<=0 직후 한 번 호출
 * state: any → dead
 */
function markAsDead(monster, respawnSeconds) {
    const m = {
        ...monster,
        state: 'dead',
        hp: 0,
        targetUserId: null,
        deadAt: (0, time_js_1.now)(),
        respawnAt: (0, time_js_1.now)() + respawnSeconds * 1000,
        lastActionAt: (0, time_js_1.now)(),
    };
    (0, monsterInstanceStore_js_1.setMonster)(m);
    logger_js_1.logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0, 8)}] dead, respawn in ${respawnSeconds}s`);
    return m;
}
/**
 * tick마다 호출 — 두 단계 전환 처리
 *
 * 1단계: dead → respawning (respawnAt 도달 시, 스탯/위치 초기화)
 * 2단계: respawning → idle (nonCombatUntil 도달 시, 전투 재개)
 */
function tickRespawn() {
    const t = (0, time_js_1.now)();
    const all = (0, monsterInstanceStore_js_1.getAllMonsters)();
    const justRespawned = [];
    const justActivated = [];
    for (const m of all) {
        // 1단계: dead → respawning
        if (m.state === 'dead' && m.respawnAt !== null && t >= m.respawnAt) {
            (0, monsterAiService_js_1.clearPatrolState)(m.monsterId);
            const respawning = {
                ...m,
                hp: m.maxHp,
                currentLat: m.spawnLat,
                currentLng: m.spawnLng,
                state: 'respawning',
                targetUserId: null,
                deadAt: null,
                respawnAt: null,
                lastActionAt: t,
                nonCombatUntil: t + constants_js_1.NON_COMBAT_AFTER_RESPAWN_MS,
            };
            (0, monsterInstanceStore_js_1.setMonster)(respawning);
            justRespawned.push(respawning);
            logger_js_1.logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0, 8)}] dead → respawning`);
        }
        // 2단계: respawning → idle
        else if (m.state === 'respawning' && t >= m.nonCombatUntil) {
            const idle = { ...m, state: 'idle' };
            (0, monsterInstanceStore_js_1.setMonster)(idle);
            justActivated.push(idle);
            logger_js_1.logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0, 8)}] respawning → idle`);
        }
    }
    // 브로드캐스트
    for (const m of justRespawned) {
        (0, clientSyncService_js_1.broadcastMonsterRespawned)(m.zoneId, m); // 리스폰 연출용
    }
    for (const m of justActivated) {
        (0, clientSyncService_js_1.broadcastMonsterUpdate)(m.zoneId, m); // idle 전환 알림
    }
}
