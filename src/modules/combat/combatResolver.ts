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

import { MonsterInstance } from '../../types/monster.js';
import { getMonstersByZone, getAllMonsters, setMonster } from '../monster/monsterInstanceStore.js';
import { getPlayer } from '../player/playerStateStore.js';
import { isTrustworthy } from '../player/playerResolver.js';
import { applyDamageToPlayer, applyDamageToMonster } from './damageService.js';
import { canMonsterAttack, canPlayerAttack, recordPlayerAttack } from './attackCooldownService.js';
import { markAsDead } from '../monster/monsterRespawnService.js';
import { generateDrop } from '../drop/dropService.js';
import {
  sendPlayerHit, sendPlayerDied,
  broadcastMonsterDied, broadcastMonsterUpdate,
} from '../gateway/clientSyncService.js';
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
      if (died) sendPlayerDied(socketId);
    }

    logger.debug('combat', `monster ${m.type} hit ${target.userId} for ${m.attackPower} (hp=${remainHp})`);
  }
}

/**
 * 플레이어 → 몬스터 공격 (C2S.PLAYER_ATTACK 수신 시 호출)
 */
export function resolvePlayerAttack(userId: string, monsterId: string): void {
  if (!canPlayerAttack(userId)) return;

  const player = getPlayer(userId);
  if (!player || !isTrustworthy(player)) return;

  // zone 불일치 방지: 전체 몬스터에서 검색 (PC 테스트 시 player.zoneId ≠ monster.zoneId 케이스 대응)
  const monster = getAllMonsters().find(m => m.monsterId === monsterId);
  if (!monster || monster.state === 'dead' || monster.state === 'respawning') return;

  const damage = player.level * 100;
  const { died } = applyDamageToMonster(monsterId, damage);
  recordPlayerAttack(userId);

  logger.debug('combat', `player ${userId} hit monster ${monster.type} for ${damage}`);

  if (died) {
    const spawn = getSpawnConfig(monster.spawnId);
    const respawnSeconds = spawn?.respawnSeconds ?? 300;
    const dead = markAsDead(monster, respawnSeconds);
    broadcastMonsterDied(dead.zoneId, dead.monsterId);
    // 드랍 생성
    generateDrop(dead);
  } else {
    const updated = getMonstersByZone(player.zoneId).find(m => m.monsterId === monsterId);
    if (updated) broadcastMonsterUpdate(updated.zoneId, updated);
  }
}
