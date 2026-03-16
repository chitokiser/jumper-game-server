/**
 * modules/admin/spawnConfigLoader.ts
 * 스폰 설정 로더
 *
 * 1차: JSON 파일 기반 로드 (src/config/spawnData.json)
 * 이후: Firestore 연동으로 확장 가능
 */

import { MonsterSpawnPoint } from '../../types/monster.js';
import { ZoneConfig } from '../../types/zone.js';
import { logger } from '../../lib/logger.js';

/** 로드된 SpawnPoint Map (spawnId → config) */
const spawnMap = new Map<string, MonsterSpawnPoint>();
let zoneConfigs: ZoneConfig[] = [];

/** 스폰 데이터 + 존 설정 로드 */
export function loadSpawnConfig(data: { zones: ZoneConfig[]; spawns: MonsterSpawnPoint[] }): void {
  zoneConfigs = data.zones;
  spawnMap.clear();
  for (const s of data.spawns) {
    spawnMap.set(s.spawnId, s);
  }
  logger.info('spawnLoader', `loaded ${data.zones.length} zones, ${data.spawns.length} spawn points`);
}

export function getSpawnConfig(spawnId: string): MonsterSpawnPoint | undefined {
  return spawnMap.get(spawnId);
}

export function getAllSpawnConfigs(): MonsterSpawnPoint[] {
  return [...spawnMap.values()];
}

export function getLoadedZoneConfigs(): ZoneConfig[] {
  return zoneConfigs;
}
