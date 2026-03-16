/**
 * modules/combat/damageService.ts
 * 데미지 적용 서비스
 *
 * 원칙: HP 감소 확정은 반드시 서버만 한다
 */

import { PlayerState } from '../../types/player.js';
import { MonsterInstance } from '../../types/monster.js';
import { getPlayer, setPlayer } from '../player/playerStateStore.js';
import { getMonster, setMonster } from '../monster/monsterInstanceStore.js';
import { now } from '../../lib/time.js';
import { logger } from '../../lib/logger.js';

/** 몬스터 → 플레이어 데미지 적용, 사망 여부 반환 */
export function applyDamageToPlayer(
  userId: string,
  damage: number,
): { died: boolean; remainHp: number } {
  const player = getPlayer(userId);
  if (!player || player.state !== 'alive') return { died: false, remainHp: 0 };

  const newHp = Math.max(0, player.hp - damage);
  const updated: PlayerState = { ...player, hp: newHp, lastAttackedAt: now() };

  if (newHp <= 0) {
    updated.state = 'dead';
    logger.info('damage', `player ${userId} died`);
  }

  setPlayer(updated);
  return { died: newHp <= 0, remainHp: newHp };
}

/** 플레이어 → 몬스터 데미지 적용, 사망 여부 반환 */
export function applyDamageToMonster(
  monsterId: string,
  damage: number,
): { died: boolean; remainHp: number } {
  const monster = getMonster(monsterId);
  if (!monster || monster.state === 'dead' || monster.state === 'respawning') {
    return { died: false, remainHp: 0 };
  }

  const newHp = Math.max(0, monster.hp - damage);
  const updated: MonsterInstance = { ...monster, hp: newHp };

  if (newHp <= 0) {
    // 사망은 CombatResolver에서 markAsDead 처리
    logger.info('damage', `monster ${monster.type} [${monsterId.slice(0,8)}] hp=0`);
  }

  setMonster(updated);
  return { died: newHp <= 0, remainHp: newHp };
}
