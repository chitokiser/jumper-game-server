/**
 * modules/gateway/clientSyncService.ts
 * 클라이언트 동기화 서비스
 *
 * - 접속 직후 존 전체 스냅샷 전송
 * - 몬스터/플레이어 상태 변경 시 이벤트 push
 */

import { emitToZone, emitToSocket } from './socketGateway.js';
import { S2C } from './eventNames.js';
import { MonsterInstance } from '../../types/monster.js';
import { DropInstance } from '../../types/drop.js';
import { getDropsByZone } from '../drop/dropStore.js';

/** 존 전체 스냅샷 전송 (접속 직후 1회)
 * 포함: monsters, drops(미수집), serverTime
 */
export function sendZoneSnapshot(socketId: string, zoneId: string, monsters: MonsterInstance[]): void {
  const drops = getDropsByZone(zoneId);
  emitToSocket(socketId, S2C.ZONE_SNAPSHOT, {
    zoneId,
    monsters,
    drops,
    serverTime: Date.now(),
  });
}

/** 몬스터 상태 변경 브로드캐스트 */
export function broadcastMonsterUpdate(zoneId: string, monster: MonsterInstance): void {
  emitToZone(zoneId, S2C.MONSTER_UPDATE, monster);
}

/** 몬스터 사망 브로드캐스트 */
export function broadcastMonsterDied(zoneId: string, monsterId: string): void {
  emitToZone(zoneId, S2C.MONSTER_DIED, { monsterId });
}

/** 몬스터 리스폰 브로드캐스트 */
export function broadcastMonsterRespawned(zoneId: string, monster: MonsterInstance): void {
  emitToZone(zoneId, S2C.MONSTER_RESPAWNED, monster);
}

/** 플레이어 피격 (해당 유저에게만) */
export function sendPlayerHit(socketId: string, damage: number, remainHp: number, monsterId: string): void {
  emitToSocket(socketId, S2C.PLAYER_HIT, { damage, remainHp, monsterId });
}

/** 플레이어 사망 */
export function sendPlayerDied(socketId: string): void {
  emitToSocket(socketId, S2C.PLAYER_DIED, {});
}

/** 플레이어 부활 완료 (해당 유저에게만) */
export function sendPlayerRevived(socketId: string, hp: number): void {
  emitToSocket(socketId, S2C.PLAYER_REVIVED, { hp });
}

/** 드랍 생성 브로드캐스트 */
export function broadcastDropSpawned(zoneId: string, drop: DropInstance): void {
  emitToZone(zoneId, S2C.DROP_SPAWNED, drop);
}
