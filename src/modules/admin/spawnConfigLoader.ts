/**
 * modules/admin/spawnConfigLoader.ts
 * 스폰 설정 로더
 *
 * - 기본 스폰: defaultWorldData.ts (서버 기동 시 로드)
 * - admin 스폰: Firestore gs_admin_spawns 컬렉션에 영구 저장
 *   → 서버 재시작 후 loadAdminSpawnsFromFirestore() 로 복원
 */

import { MonsterSpawnPoint } from '../../types/monster.js';
import { ZoneConfig } from '../../types/zone.js';
import { logger } from '../../lib/logger.js';
import { getFirestore } from '../../lib/firebaseAdmin.js';

const FS_COLLECTION = 'gs_admin_spawns';

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

/** 런타임에 스폰 포인트 추가 (관리자 배치) + Firestore 영구 저장 */
export function addSpawnConfig(spawn: MonsterSpawnPoint): void {
  spawnMap.set(spawn.spawnId, spawn);
  logger.info('spawnLoader', `[admin] added spawn ${spawn.spawnId} (${spawn.monsterType} @ zone ${spawn.zoneId})`);
  const db = getFirestore();
  if (db) {
    db.collection(FS_COLLECTION).doc(spawn.spawnId).set(spawn)
      .catch(err => logger.warn('spawnLoader', `Firestore save failed: ${err.message}`));
  }
}

/** 서버 시작 시 Firestore에서 admin 스폰 복원 */
export async function loadAdminSpawnsFromFirestore(): Promise<number> {
  const db = getFirestore();
  if (!db) return 0;
  try {
    const snap = await db.collection(FS_COLLECTION).get();
    let count = 0;
    for (const doc of snap.docs) {
      const spawn = doc.data() as MonsterSpawnPoint;
      if (!spawnMap.has(spawn.spawnId)) {
        spawnMap.set(spawn.spawnId, spawn);
        count++;
      }
    }
    if (count > 0) logger.info('spawnLoader', `Firestore에서 admin 스폰 ${count}개 복원`);
    return count;
  } catch (err: any) {
    logger.warn('spawnLoader', `Firestore 스폰 복원 실패: ${err.message}`);
    return 0;
  }
}

/** 런타임에 스폰 포인트 제거 (관리자 삭제) + Firestore 삭제 */
export function removeSpawnConfig(spawnId: string): MonsterSpawnPoint | undefined {
  const spawn = spawnMap.get(spawnId);
  spawnMap.delete(spawnId);
  if (spawn) {
    logger.info('spawnLoader', `[admin] removed spawn ${spawnId}`);
    const db = getFirestore();
    if (db) {
      db.collection(FS_COLLECTION).doc(spawnId).delete()
        .catch(err => logger.warn('spawnLoader', `Firestore delete failed: ${err.message}`));
    }
  }
  return spawn;
}
