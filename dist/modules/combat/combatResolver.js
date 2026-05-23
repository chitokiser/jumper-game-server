"use strict";
/**
 * modules/combat/combatResolver.ts
 * 전투 판정 최종 확정
 *
 * 역할
 * - 몬스터 → 플레이어 공격 (tick 기반)
 * - 플레이어 → 몬스터 공격 (이벤트 기반)
 *
 * 원칙: 모든 HP 확정은 여기서만 한다
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tickCombat = tickCombat;
exports.resolvePlayerAttack = resolvePlayerAttack;
exports.resolvePlayerSkill = resolvePlayerSkill;
const monsterInstanceStore_js_1 = require("../monster/monsterInstanceStore.js");
const playerStateStore_js_1 = require("../player/playerStateStore.js");
const i18n_js_1 = require("../../lib/i18n.js");
const playerResolver_js_1 = require("../player/playerResolver.js");
const damageService_js_1 = require("./damageService.js");
const attackCooldownService_js_1 = require("./attackCooldownService.js");
const monsterRespawnService_js_1 = require("../monster/monsterRespawnService.js");
const dropService_js_1 = require("../drop/dropService.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const expService_js_1 = require("../exp/expService.js");
const FREEZE_DURATION_MS = 20000;
const PLAYER_ATTACK_RANGE_M = 40;
const socketGateway_js_1 = require("../gateway/socketGateway.js");
const geo_js_1 = require("../../lib/geo.js");
const spawnConfigLoader_js_1 = require("../admin/spawnConfigLoader.js");
const time_js_1 = require("../../lib/time.js");
const logger_js_1 = require("../../lib/logger.js");
/**
 * tick마다 호출 — 존 내 모든 attacking 몬스터의 공격 처리
 */
function tickCombat(zoneId) {
    const monsters = (0, monsterInstanceStore_js_1.getMonstersByZone)(zoneId);
    for (const m of monsters) {
        if (m.state !== 'attacking')
            continue;
        if (!m.targetUserId)
            continue;
        if ((0, time_js_1.now)() < m.nonCombatUntil)
            continue; // 리스폰 유예
        if ((0, time_js_1.now)() < (m.frozenUntil ?? 0))
            continue; // 얼음 동결 중
        if (!(0, attackCooldownService_js_1.canMonsterAttack)(m.lastActionAt, m.attackCooldownMs))
            continue;
        const target = (0, playerStateStore_js_1.getPlayer)(m.targetUserId);
        if (!target || !(0, playerResolver_js_1.isTrustworthy)(target))
            continue;
        // 거리 재확인
        const dist = (0, geo_js_1.haversineM)(m.currentLat, m.currentLng, target.lat, target.lng);
        if (dist > m.attackRangeM)
            continue;
        // 데미지 적용
        const { died, remainHp } = (0, damageService_js_1.applyDamageToPlayer)(target.userId, m.attackPower);
        // lastActionAt 갱신
        (0, monsterInstanceStore_js_1.setMonster)({ ...m, lastActionAt: (0, time_js_1.now)() });
        // 피격 이벤트 전송
        const socketId = (0, socketGateway_js_1.getSocketId)(target.userId);
        if (socketId) {
            (0, clientSyncService_js_1.sendPlayerHit)(socketId, m.attackPower, remainHp, m.monsterId);
            if (died) {
                (0, clientSyncService_js_1.sendPlayerDied)(socketId);
                (0, clientSyncService_js_1.sendNotify)(socketId, (0, i18n_js_1.t)((0, playerStateStore_js_1.getLangBySocket)(socketId), 'player_died'));
            }
        }
        logger_js_1.logger.debug('combat', `monster ${m.type} hit ${target.userId} for ${m.attackPower} (hp=${remainHp})`);
    }
}
/**
 * 플레이어 → 몬스터 공격 (C2S.PLAYER_ATTACK 수신 시 호출)
 */
function resolvePlayerAttack(userId, monsterId) {
    if (!(0, attackCooldownService_js_1.canPlayerAttack)(userId)) {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: cooldown`);
        return;
    }
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player) {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: no player record`);
        return;
    }
    // 클릭 기반 공격 — accuracy 무관, state만 체크 (PC 테스트 포함)
    if (player.state !== 'alive') {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: state=${player.state}`);
        return;
    }
    // zone 불일치 방지: 전체 몬스터에서 검색 (PC 테스트 시 player.zoneId ≠ monster.zoneId 케이스 대응)
    const monster = (0, monsterInstanceStore_js_1.getAllMonsters)().find(m => m.monsterId === monsterId);
    if (!monster) {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: monster ${monsterId.slice(0, 8)} not found`);
        return;
    }
    if (monster.state === 'dead' || monster.state === 'respawning') {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: monster state=${monster.state}`);
        return;
    }
    // 40m 공격 거리 체크
    const attackDist = (0, geo_js_1.haversineM)(player.lat, player.lng, monster.currentLat, monster.currentLng);
    if (attackDist > PLAYER_ATTACK_RANGE_M) {
        logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} → BLOCKED: dist=${attackDist.toFixed(0)}m > ${PLAYER_ATTACK_RANGE_M}m`);
        return;
    }
    const damage = player.level * 100;
    const { died } = (0, damageService_js_1.applyDamageToMonster)(monsterId, damage);
    (0, attackCooldownService_js_1.recordPlayerAttack)(userId);
    logger_js_1.logger.info('combat', `[attack] ${userId.slice(0, 8)} hit ${monster.type} for ${damage} (died=${died})`);
    if (died) {
        const spawn = (0, spawnConfigLoader_js_1.getSpawnConfig)(monster.spawnId);
        const respawnSeconds = spawn?.respawnSeconds ?? 300;
        const dead = (0, monsterRespawnService_js_1.markAsDead)(monster, respawnSeconds);
        (0, clientSyncService_js_1.broadcastMonsterDied)(dead.zoneId, dead.monsterId);
        (0, dropService_js_1.generateDrop)(dead);
        (0, expService_js_1.awardExpOnKill)(userId, monster.maxHp);
    }
    else {
        const updated = (0, monsterInstanceStore_js_1.getAllMonsters)().find(m => m.monsterId === monsterId);
        if (updated)
            (0, clientSyncService_js_1.broadcastMonsterUpdate)(updated.zoneId, updated);
    }
}
/** 스킬 데미지 배율 */
const SKILL_MULTIPLIER = {
    lightning: 2.0,
    fire: 2.0,
    ice: 1.5,
    wind: 2.5,
    meteor: 3.0,
};
/** 스킬별 사거리 오버라이드 (기본: PLAYER_ATTACK_RANGE_M=40m) */
const SKILL_RANGE_OVERRIDE_M = {
    meteor: 60,
};
/**
 * 플레이어 스킬 → 몬스터 (C2S.PLAYER_SKILL 수신 시 호출)
 * 클라이언트가 범위 내 각 몬스터에 대해 개별 호출
 */
function resolvePlayerSkill(userId, skillId, monsterId) {
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player || player.state !== 'alive')
        return;
    const monster = (0, monsterInstanceStore_js_1.getAllMonsters)().find(m => m.monsterId === monsterId);
    if (!monster || monster.state === 'dead' || monster.state === 'respawning')
        return;
    // 스킬 사거리 체크 (meteor은 60m, 기본 40m)
    const rangeM = SKILL_RANGE_OVERRIDE_M[skillId] ?? PLAYER_ATTACK_RANGE_M;
    const skillDist = (0, geo_js_1.haversineM)(player.lat, player.lng, monster.currentLat, monster.currentLng);
    if (skillDist > rangeM) {
        logger_js_1.logger.info('combat', `[skill:${skillId}] ${userId.slice(0, 8)} → BLOCKED: dist=${skillDist.toFixed(0)}m > ${rangeM}m`);
        return;
    }
    const multiplier = SKILL_MULTIPLIER[skillId] ?? 1.0;
    const damage = Math.round(player.level * 100 * multiplier);
    const { died } = (0, damageService_js_1.applyDamageToMonster)(monsterId, damage);
    // 얼음 스킬: 동결 효과 적용 (이동/공격 20초 차단)
    if (skillId === 'ice' && !died) {
        const current = (0, monsterInstanceStore_js_1.getAllMonsters)().find(m => m.monsterId === monsterId);
        if (current) {
            (0, monsterInstanceStore_js_1.setMonster)({ ...current, frozenUntil: (0, time_js_1.now)() + FREEZE_DURATION_MS });
        }
    }
    logger_js_1.logger.info('combat', `[skill:${skillId}] ${userId.slice(0, 8)} hit ${monster.type} for ${damage} (died=${died})`);
    if (died) {
        const spawn = (0, spawnConfigLoader_js_1.getSpawnConfig)(monster.spawnId);
        const respawnSeconds = spawn?.respawnSeconds ?? 300;
        const dead = (0, monsterRespawnService_js_1.markAsDead)(monster, respawnSeconds);
        (0, clientSyncService_js_1.broadcastMonsterDied)(dead.zoneId, dead.monsterId);
        (0, dropService_js_1.generateDrop)(dead);
        (0, expService_js_1.awardExpOnKill)(userId, monster.maxHp);
    }
    else {
        const updated = (0, monsterInstanceStore_js_1.getAllMonsters)().find(m => m.monsterId === monsterId);
        if (updated)
            (0, clientSyncService_js_1.broadcastMonsterUpdate)(updated.zoneId, updated);
    }
}
