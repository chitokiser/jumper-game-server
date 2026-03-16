/**
 * modules/admin/zoneReloadService.ts
 * 존/스폰 설정 핫 리로드 서비스
 *
 * 향후 관리자 API (/admin/reload) 등에서 호출
 */

import { loadSpawnConfig } from './spawnConfigLoader.js';
import { registerZone } from '../zone/zoneRegistry.js';
import { initAllSpawns } from '../monster/monsterSpawnService.js';
import { getDefaultWorldData } from '../../config/defaultWorldData.js';
import { logger } from '../../lib/logger.js';

export async function reloadWorld(): Promise<void> {
  logger.info('zoneReload', 'reloading world config...');
  const data = getDefaultWorldData();
  loadSpawnConfig(data);
  for (const zone of data.zones) {
    registerZone(zone);
  }
  initAllSpawns(data.spawns);
  logger.info('zoneReload', 'world reload complete');
}
