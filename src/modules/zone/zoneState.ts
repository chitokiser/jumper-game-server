/**
 * modules/zone/zoneState.ts
 * 존의 런타임 상태 — 현재 접속 중인 플레이어 목록
 *
 * 몬스터 인스턴스는 monsterInstanceStore에서 zoneId로 별도 관리
 */

/** 존 하나의 런타임 상태 */
export interface ZoneRuntimeState {
  zoneId: string;
  /** 현재 이 존에 있는 userId Set */
  players: Set<string>;
  /** 마지막 활성 tick 시각 */
  lastTickAt: number;
  /** 마지막 클라이언트 브로드캐스트 시각 */
  lastBroadcastAt: number;
}

const states = new Map<string, ZoneRuntimeState>();

export function getOrCreateZoneState(zoneId: string): ZoneRuntimeState {
  if (!states.has(zoneId)) {
    states.set(zoneId, { zoneId, players: new Set(), lastTickAt: 0, lastBroadcastAt: 0 });
  }
  return states.get(zoneId)!;
}

export function setLastBroadcastAt(zoneId: string, t: number): void {
  const s = states.get(zoneId);
  if (s) s.lastBroadcastAt = t;
}

export function addPlayerToZone(zoneId: string, userId: string): void {
  getOrCreateZoneState(zoneId).players.add(userId);
}

export function removePlayerFromZone(zoneId: string, userId: string): void {
  states.get(zoneId)?.players.delete(userId);
}

export function getPlayersInZone(zoneId: string): string[] {
  return [...(states.get(zoneId)?.players ?? [])];
}

export function hasPlayers(zoneId: string): boolean {
  return (states.get(zoneId)?.players.size ?? 0) > 0;
}

export function setLastTickAt(zoneId: string, t: number): void {
  const s = states.get(zoneId);
  if (s) s.lastTickAt = t;
}
