/**
 * modules/monster/monsterInstanceStore.ts
 * 몬스터 인스턴스 인메모리 저장소
 *
 * ⚠️ 이 저장소는 런타임 전용 — 서버 재시작 시 초기화됨
 *    영속성이 필요하면 별도 DB 연동 필요 (1차에서는 메모리 운영)
 */

import { MonsterInstance } from '../../types/monster.js';

/** monsterId → MonsterInstance */
const store = new Map<string, MonsterInstance>();

export function setMonster(m: MonsterInstance): void {
  store.set(m.monsterId, m);
}

export function getMonster(monsterId: string): MonsterInstance | undefined {
  return store.get(monsterId);
}

export function removeMonster(monsterId: string): void {
  store.delete(monsterId);
}

export function getAllMonsters(): MonsterInstance[] {
  return [...store.values()];
}

export function getMonstersByZone(zoneId: string): MonsterInstance[] {
  return [...store.values()].filter(m => m.zoneId === zoneId);
}

/** 특정 SpawnPoint에서 생성된 살아있는 인스턴스 수 */
export function countAliveBySpawn(spawnId: string): number {
  return [...store.values()].filter(
    m => m.spawnId === spawnId && m.state !== 'dead' && m.state !== 'respawning',
  ).length;
}

/** 죽은 몬스터 중 리스폰 대기 중인 것들 */
export function getDeadMonsters(): MonsterInstance[] {
  return [...store.values()].filter(
    m => m.state === 'dead' || m.state === 'respawning',
  );
}
