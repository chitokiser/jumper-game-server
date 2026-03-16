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

import { MonsterInstance } from '../../types/monster.js';
import { getAllMonsters, setMonster } from './monsterInstanceStore.js';
import {
  broadcastMonsterRespawned,
  broadcastMonsterUpdate,
} from '../gateway/clientSyncService.js';
import { now } from '../../lib/time.js';
import { NON_COMBAT_AFTER_RESPAWN_MS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';

/**
 * 사망 처리 — hp<=0 직후 한 번 호출
 * state: any → dead
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
 * tick마다 호출 — 두 단계 전환 처리
 *
 * 1단계: dead → respawning (respawnAt 도달 시, 스탯/위치 초기화)
 * 2단계: respawning → idle (nonCombatUntil 도달 시, 전투 재개)
 */
export function tickRespawn(): void {
  const t = now();
  const all = getAllMonsters();

  const justRespawned: MonsterInstance[] = [];
  const justActivated: MonsterInstance[] = [];

  for (const m of all) {
    // 1단계: dead → respawning
    if (m.state === 'dead' && m.respawnAt !== null && t >= m.respawnAt) {
      const respawning: MonsterInstance = {
        ...m,
        hp:             m.maxHp,
        currentLat:     m.spawnLat,
        currentLng:     m.spawnLng,
        state:          'respawning',
        targetUserId:   null,
        deadAt:         null,
        respawnAt:      null,
        lastActionAt:   t,
        nonCombatUntil: t + NON_COMBAT_AFTER_RESPAWN_MS,
      };
      setMonster(respawning);
      justRespawned.push(respawning);
      logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0,8)}] dead → respawning`);
    }

    // 2단계: respawning → idle
    else if (m.state === 'respawning' && t >= m.nonCombatUntil) {
      const idle: MonsterInstance = { ...m, state: 'idle' };
      setMonster(idle);
      justActivated.push(idle);
      logger.debug('monsterRespawn', `${m.type} [${m.monsterId.slice(0,8)}] respawning → idle`);
    }
  }

  // 브로드캐스트
  for (const m of justRespawned) {
    broadcastMonsterRespawned(m.zoneId, m);   // 리스폰 연출용
  }
  for (const m of justActivated) {
    broadcastMonsterUpdate(m.zoneId, m);       // idle 전환 알림
  }
}
