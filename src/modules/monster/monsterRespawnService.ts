/**
 * modules/monster/monsterRespawnService.ts
 * 몬스터 리스폰 서비스 — 1차 핵심 기능
 *
 * 원칙: 몬스터는 죽어도 삭제하지 않는다
 *
 * 사망 처리 흐름:
 *   hp <= 0 → state=dead, deadAt=now, respawnAt=now+respawnSeconds*1000
 *
 * 리스폰 처리 흐름:
 *   respawnAt <= now → hp 초기화, 위치 초기화, state=idle, nonCombatUntil 설정
 */

import { MonsterInstance } from '../../types/monster.js';
import { getDeadMonsters, setMonster } from './monsterInstanceStore.js';
import { broadcastMonsterRespawned } from '../gateway/clientSyncService.js';
import { now } from '../../lib/time.js';
import { NON_COMBAT_AFTER_RESPAWN_MS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';

/**
 * 죽은 몬스터를 dead → respawning 상태로 전환
 * (사망 직후 한 번 호출)
 */
export function markAsDead(monster: MonsterInstance, respawnSeconds: number): MonsterInstance {
  const m: MonsterInstance = {
    ...monster,
    state:        'dead',
    hp:           0,
    targetUserId: null,
    deadAt:       now(),
    respawnAt:    now() + respawnSeconds * 1000,
    lastActionAt: now(),
  };
  setMonster(m);
  logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0,8)}] dead, respawn in ${respawnSeconds}s`);
  return m;
}

/**
 * tick마다 호출 — respawnAt이 지난 몬스터 리스폰 처리
 * 리스폰된 몬스터 목록 반환
 */
export function tickRespawn(): MonsterInstance[] {
  const t = now();
  const dead = getDeadMonsters();
  const revived: MonsterInstance[] = [];

  for (const m of dead) {
    if (m.respawnAt !== null && t >= m.respawnAt) {
      const revived_m: MonsterInstance = {
        ...m,
        hp:             m.maxHp,
        currentLat:     m.spawnLat,
        currentLng:     m.spawnLng,
        state:          'idle',
        targetUserId:   null,
        deadAt:         null,
        respawnAt:      null,
        lastActionAt:   t,
        nonCombatUntil: t + NON_COMBAT_AFTER_RESPAWN_MS,
      };
      setMonster(revived_m);
      revived.push(revived_m);
      logger.debug('monsterRespawn', `${revived_m.type} [${revived_m.monsterId.slice(0,8)}] respawned`);
    }
  }

  // 리스폰 이벤트 브로드캐스트
  for (const m of revived) {
    broadcastMonsterRespawned(m.zoneId, m);
  }

  return revived;
}
