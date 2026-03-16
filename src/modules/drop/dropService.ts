/**
 * modules/drop/dropService.ts
 * 드랍 아이템 생성 서비스
 *
 * - 몬스터 사망 시 호출
 * - 실제 인벤토리 지급은 Firebase Functions 담당
 * - 게임 서버는 드랍 위치/아이템 정보만 관리
 */

import { v4 as uuidv4 } from 'uuid';
import { MonsterInstance } from '../../types/monster.js';
import { DropInstance } from '../../types/drop.js';
import { setDrop } from './dropStore.js';
import { broadcastDropSpawned } from '../gateway/clientSyncService.js';
import { DROP_EXPIRE_MS } from '../../config/constants.js';
import { now } from '../../lib/time.js';
import { logger } from '../../lib/logger.js';

/** 몬스터 타입별 드랍 테이블 (단순화) */
const DROP_TABLE: Record<string, Array<{ itemId: string; count: number; chance: number }>> = {
  goblin: [
    { itemId: '1', count: 1, chance: 0.8 },
    { itemId: '2', count: 1, chance: 0.3 },
  ],
  orc: [
    { itemId: '2', count: 1, chance: 0.6 },
    { itemId: '3', count: 1, chance: 0.4 },
  ],
  // 기본값 — 등록되지 않은 타입
  default: [
    { itemId: '1', count: 1, chance: 0.5 },
  ],
};

/** 몬스터 사망 시 드랍 생성 및 브로드캐스트 */
export function generateDrop(monster: MonsterInstance): void {
  const table = DROP_TABLE[monster.type] ?? DROP_TABLE.default;
  const t = now();

  for (const entry of table) {
    if (Math.random() > entry.chance) continue;

    const drop: DropInstance = {
      dropId:    uuidv4(),
      zoneId:    monster.zoneId,
      monsterId: monster.monsterId,
      lat:       monster.currentLat,
      lng:       monster.currentLng,
      itemId:    entry.itemId,
      count:     entry.count,
      createdAt: t,
      expiresAt: t + DROP_EXPIRE_MS,
      claimedBy: null,
    };

    setDrop(drop);
    broadcastDropSpawned(monster.zoneId, drop);
    logger.debug('drop', `drop item=${entry.itemId} from ${monster.type}`);
  }
}
