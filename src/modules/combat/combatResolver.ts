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

import { getMonstersByZone, getAllMonsters, setMonster } from '../monster/monsterInstanceStore.js';
import { getPlayer, getLangBySocket } from '../player/playerStateStore.js';
import { t } from '../../lib/i18n.js';
import { isTrustworthy } from '../player/playerResolver.js';
import { applyDamageToPlayer, applyDamageToMonster } from './damageService.js';
import { canMonsterAttack, canPlayerAttack, recordPlayerAttack } from './attackCooldownService.js';
import { markAsDead } from '../monster/monsterRespawnService.js';
import { generateDrop } from '../drop/dropService.js';
import {
  sendPlayerHit, sendPlayerDied, sendNotify,
  broadcastMonsterDied, broadcastMonsterUpdate,
} from '../gateway/clientSyncService.js';
import { awardExpOnKill } from '../exp/expService.js';

const FREEZE_DURATION_MS = 20_000;
const PLAYER_ATTACK_RANGE_M = 40;
import { getSocketId } from '../gateway/socketGateway.js';
import { haversineM } from '../../lib/geo.js';
import { getSpawnConfig } from '../admin/spawnConfigLoader.js';
import { now } from '../../lib/time.js';
import { logger } from '../../lib/logger.js';

/**
 * tick마다 호출 — 존 내 모든 attacking 몬스터의 공격 처리
 */
export function tickCombat(zoneId: string): void {
  const monsters = getMonstersByZone(zoneId);

  for (const m of monsters) {
    if (m.state !== 'attacking') continue;
    if (!m.targetUserId) continue;
    if (now() < m.nonCombatUntil) continue; // 리스폰 유예
    if (now() < (m.frozenUntil ?? 0)) continue; // 얼음 동결 중

    if (!canMonsterAttack(m.lastActionAt, m.attackCooldownMs)) continue;

    const target = getPlayer(m.targetUserId);
    if (!target || !isTrustworthy(target)) continue;

    // 거리 재확인
    const dist = haversineM(m.currentLat, m.currentLng, target.lat, target.lng);
    if (dist > m.attackRangeM) continue;

    // 데미지 적용
    const { died, remainHp } = applyDamageToPlayer(target.userId, m.attackPower);

    // lastActionAt 갱신
    setMonster({ ...m, lastActionAt: now() });

    // 피격 이벤트 전송
    const socketId = getSocketId(target.userId);
    if (socketId) {
      sendPlayerHit(socketId, m.attackPower, remainHp, m.monsterId);
      if (died) {
        sendPlayerDied(socketId);
        sendNotify(socketId, t(getLangBySocket(socketId), 'player_died'));
      }
    }

    logger.debug('combat', `monster ${m.type} hit ${target.userId} for ${m.attackPower} (hp=${remainHp})`);
  }
}

/**
 * 플레이어 → 몬스터 공격 (C2S.PLAYER_ATTACK 수신 시 호출)
 */
export function resolvePlayerAttack(userId: string, monsterId: string): void {
  if (!canPlayerAttack(userId)) {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: cooldown`);
    return;
  }

  const player = getPlayer(userId);
  if (!player) {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: no player record`);
    return;
  }
  // 클릭 기반 공격 — accuracy 무관, state만 체크 (PC 테스트 포함)
  if (player.state !== 'alive') {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: state=${player.state}`);
    return;
  }

  // zone 불일치 방지: 전체 몬스터에서 검색 (PC 테스트 시 player.zoneId ≠ monster.zoneId 케이스 대응)
  const monster = getAllMonsters().find(m => m.monsterId === monsterId);
  if (!monster) {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: monster ${monsterId.slice(0,8)} not found`);
    return;
  }
  if (monster.state === 'dead' || monster.state === 'respawning') {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: monster state=${monster.state}`);
    return;
  }

  // 40m 공격 거리 체크
  const attackDist = haversineM(player.lat, player.lng, monster.currentLat, monster.currentLng);
  if (attackDist > PLAYER_ATTACK_RANGE_M) {
    logger.info('combat', `[attack] ${userId.slice(0,8)} → BLOCKED: dist=${attackDist.toFixed(0)}m > ${PLAYER_ATTACK_RANGE_M}m`);
    return;
  }

  const damage = player.level * 100;
  const { died } = applyDamageToMonster(monsterId, damage);
  recordPlayerAttack(userId);

  logger.info('combat', `[attack] ${userId.slice(0,8)} hit ${monster.type} for ${damage} (died=${died})`);

  if (died) {
    const spawn = getSpawnConfig(monster.spawnId);
    const respawnSeconds = spawn?.respawnSeconds ?? 300;
    const dead = markAsDead(monster, respawnSeconds);
    broadcastMonsterDied(dead.zoneId, dead.monsterId);
    generateDrop(dead);
    awardExpOnKill(userId, monster.maxHp);
  } else {
    const updated = getAllMonsters().find(m => m.monsterId === monsterId);
    if (updated) broadcastMonsterUpdate(updated.zoneId, updated);
  }
}

/** 스킬 데미지 배율 */
const SKILL_MULTIPLIER: Record<string, number> = {
  lightning: 2.0,
  fire:      2.0,
  ice:       1.5,
  wind:      2.5,
  meteor:    3.0,
};

/** 스킬별 사거리 오버라이드 (기본: PLAYER_ATTACK_RANGE_M=40m) */
const SKILL_RANGE_OVERRIDE_M: Record<string, number> = {
  meteor: 60,
};

/**
 * 플레이어 스킬 → 몬스터 (C2S.PLAYER_SKILL 수신 시 호출)
 * 클라이언트가 범위 내 각 몬스터에 대해 개별 호출
 */
export function resolvePlayerSkill(userId: string, skillId: string, monsterId: string): void {
  const player = getPlayer(userId);
  if (!player || player.state !== 'alive') return;

  const monster = getAllMonsters().find(m => m.monsterId === monsterId);
  if (!monster || monster.state === 'dead' || monster.state === 'respawning') return;

  // 스킬 사거리 체크 (meteor은 60m, 기본 40m)
  const rangeM = SKILL_RANGE_OVERRIDE_M[skillId] ?? PLAYER_ATTACK_RANGE_M;
  const skillDist = haversineM(player.lat, player.lng, monster.currentLat, monster.currentLng);
  if (skillDist > rangeM) {
    logger.info('combat', `[skill:${skillId}] ${userId.slice(0,8)} → BLOCKED: dist=${skillDist.toFixed(0)}m > ${rangeM}m`);
    return;
  }

  const multiplier = SKILL_MULTIPLIER[skillId] ?? 1.0;
  const damage = Math.round(player.level * 100 * multiplier);
  const { died } = applyDamageToMonster(monsterId, damage);

  // 얼음 스킬: 동결 효과 적용 (이동/공격 20초 차단)
  if (skillId === 'ice' && !died) {
    const current = getAllMonsters().find(m => m.monsterId === monsterId);
    if (current) {
      setMonster({ ...current, frozenUntil: now() + FREEZE_DURATION_MS });
    }
  }

  logger.info('combat', `[skill:${skillId}] ${userId.slice(0,8)} hit ${monster.type} for ${damage} (died=${died})`);

  if (died) {
    const spawn = getSpawnConfig(monster.spawnId);
    const respawnSeconds = spawn?.respawnSeconds ?? 300;
    const dead = markAsDead(monster, respawnSeconds);
    broadcastMonsterDied(dead.zoneId, dead.monsterId);
    generateDrop(dead);
    awardExpOnKill(userId, monster.maxHp);
  } else {
    const updated = getAllMonsters().find(m => m.monsterId === monsterId);
    if (updated) broadcastMonsterUpdate(updated.zoneId, updated);
  }
}
