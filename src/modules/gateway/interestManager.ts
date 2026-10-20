/**
 * modules/gateway/interestManager.ts
 * 플레이어별 "보이는 몬스터" 관리 — 내 주변 VIEW_RADIUS_M 안의 몬스터만 보낸다
 *
 * 배경 (2026-10-20): 존 하나에 몬스터가 수백~수천 마리 몰리면(약물상점 스폰)
 * 매 tick 존 전체를 모든 플레이어에게 보내 휴대폰이 버벅였다.
 *
 * - 스냅샷: 접속 위치 기준 반경 안의 몬스터만
 * - tick: 반경 안에서 (바뀐 몬스터 + 새로 반경에 들어온 몬스터)만 그 플레이어에게 전송
 * - 반경 밖으로 나간 몬스터는 클라이언트가 거리로 직접 지운다 (별도 이벤트 없음)
 * - 사망·리스폰·피격 단건 이벤트는 기존처럼 존 전체 전송 (작음)
 */

import { MonsterInstance } from '../../types/monster.js';
import { PlayerState } from '../../types/player.js';
import { haversineM } from '../../lib/geo.js';
import { emitToSocket, getSocketId } from './socketGateway.js';
import { S2C } from './eventNames.js';

export const VIEW_RADIUS_M = 300;

/** userId → 마지막으로 보낸 '보이는 몬스터' ID */
const _known = new Map<string, Set<string>>();

export function visibleMonsters(lat: number, lng: number, monsters: MonsterInstance[]): MonsterInstance[] {
  return monsters.filter(m => haversineM(lat, lng, m.currentLat, m.currentLng) <= VIEW_RADIUS_M);
}

/** 스냅샷 전송 직후 호출 — 보낸 목록을 기억 */
export function resetKnown(userId: string, monsters: MonsterInstance[]): void {
  _known.set(userId, new Set(monsters.map(m => m.monsterId)));
}

export function forgetPlayer(userId: string): void {
  _known.delete(userId);
}

/** tick마다: 플레이어별로 필요한 몬스터만 전송 */
export function syncZoneToPlayers(players: PlayerState[], monsters: MonsterInstance[], changedIds: Set<string>): void {
  for (const p of players) {
    const socketId = getSocketId(p.userId);
    if (!socketId) continue;
    const known = _known.get(p.userId) ?? new Set<string>();
    const visible = visibleMonsters(p.lat, p.lng, monsters);
    const send = visible.filter(m => changedIds.has(m.monsterId) || !known.has(m.monsterId));
    _known.set(p.userId, new Set(visible.map(m => m.monsterId)));
    if (send.length > 0) emitToSocket(socketId, S2C.MONSTER_BATCH_UPDATE, send);
  }
}
