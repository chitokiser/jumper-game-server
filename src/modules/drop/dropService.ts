/**
 * modules/drop/dropService.ts
 * 드랍 아이템 생성 서비스
 *
 * - 몬스터 사망 시 호출
 * - 게임 서버는 코인 드랍 위치/금액 관리
 */

import { v4 as uuidv4 } from 'uuid';
import { MonsterInstance } from '../../types/monster.js';
import { DropInstance } from '../../types/drop.js';
import { setDrop, getDrop, removeDrop } from './dropStore.js';
import { broadcastDropSpawned, broadcastDropRemoved, sendDropCollected, sendNotify } from '../gateway/clientSyncService.js';
import { getLangBySocket } from '../player/playerStateStore.js';
import { t } from '../../lib/i18n.js';
import { DROP_EXPIRE_MS } from '../../config/constants.js';
import { now } from '../../lib/time.js';
import { logger } from '../../lib/logger.js';

/** 몬스터 타입별 코인 드랍 범위 [min, max] */
const COIN_DROP: Record<string, [number, number]> = {
  goblin:  [5,   15],
  pirate:  [10,  25],
  pirate2: [20,  40],
  pirate3: [35,  60],
  orc:     [25,  45],
  orc2:    [50,  80],
  orc3:    [80, 120],
  dragon:  [200, 350],
  default: [5,   20],
};

function randCoin(type: string): number {
  const [min, max] = COIN_DROP[type] ?? COIN_DROP.default;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** 몬스터 사망 시 코인 드랍 생성 및 브로드캐스트 */
export function generateDrop(monster: MonsterInstance): void {
  const gold = randCoin(monster.type);
  const t = now();

  const drop: DropInstance = {
    dropId:    uuidv4(),
    zoneId:    monster.zoneId,
    monsterId: monster.monsterId,
    lat:       monster.currentLat + (Math.random() - 0.5) * 0.00003,
    lng:       monster.currentLng + (Math.random() - 0.5) * 0.00003,
    itemId:    'gold',
    count:     gold,
    gold,
    createdAt: t,
    expiresAt: t + DROP_EXPIRE_MS,
    claimedBy: null,
  };

  setDrop(drop);
  broadcastDropSpawned(monster.zoneId, drop);
  logger.debug('drop', `coin drop ${gold} from ${monster.type}`);
}

export function collectDrop(socketId: string, dropId: string): void {
  const drop = getDrop(dropId);
  if (!drop || drop.claimedBy) return;

  drop.claimedBy = socketId;
  removeDrop(dropId);

  broadcastDropRemoved(drop.zoneId, dropId);
  const gold = drop.gold ?? drop.count;
  sendDropCollected(socketId, dropId, gold);
  sendNotify(socketId, t(getLangBySocket(socketId), 'drop_gold', gold));

  logger.debug('drop', `drop ${dropId} collected, gold=${gold}`);
}
