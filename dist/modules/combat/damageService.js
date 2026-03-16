"use strict";
/**
 * modules/combat/damageService.ts
 * 데미지 적용 서비스
 *
 * 원칙: HP 감소 확정은 반드시 서버만 한다
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDamageToPlayer = applyDamageToPlayer;
exports.applyDamageToMonster = applyDamageToMonster;
const playerStateStore_js_1 = require("../player/playerStateStore.js");
const monsterInstanceStore_js_1 = require("../monster/monsterInstanceStore.js");
const time_js_1 = require("../../lib/time.js");
const logger_js_1 = require("../../lib/logger.js");
/** 몬스터 → 플레이어 데미지 적용, 사망 여부 반환 */
function applyDamageToPlayer(userId, damage) {
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player || player.state !== 'alive')
        return { died: false, remainHp: 0 };
    const newHp = Math.max(0, player.hp - damage);
    const updated = { ...player, hp: newHp, lastAttackedAt: (0, time_js_1.now)() };
    if (newHp <= 0) {
        updated.state = 'dead';
        logger_js_1.logger.info('damage', `player ${userId} died`);
    }
    (0, playerStateStore_js_1.setPlayer)(updated);
    return { died: newHp <= 0, remainHp: newHp };
}
/** 플레이어 → 몬스터 데미지 적용, 사망 여부 반환 */
function applyDamageToMonster(monsterId, damage) {
    const monster = (0, monsterInstanceStore_js_1.getMonster)(monsterId);
    if (!monster || monster.state === 'dead' || monster.state === 'respawning') {
        return { died: false, remainHp: 0 };
    }
    const newHp = Math.max(0, monster.hp - damage);
    const updated = { ...monster, hp: newHp };
    if (newHp <= 0) {
        // 사망은 CombatResolver에서 markAsDead 처리
        logger_js_1.logger.info('damage', `monster ${monster.type} [${monsterId.slice(0, 8)}] hp=0`);
    }
    (0, monsterInstanceStore_js_1.setMonster)(updated);
    return { died: newHp <= 0, remainHp: newHp };
}
