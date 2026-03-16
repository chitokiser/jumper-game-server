/**
 * modules/player/playerStateStore.ts
 * 플레이어 실시간 상태 인메모리 저장소
 */

import { PlayerState } from '../../types/player.js';

/** userId → PlayerState */
const store = new Map<string, PlayerState>();

/** socketId → userId (세션 관리용) */
const socketToUser = new Map<string, string>();

export function setPlayer(state: PlayerState): void {
  store.set(state.userId, state);
}

export function getPlayer(userId: string): PlayerState | undefined {
  return store.get(userId);
}

export function removePlayer(userId: string): void {
  store.delete(userId);
}

export function getAllPlayers(): PlayerState[] {
  return [...store.values()];
}

export function getPlayersInZone(zoneId: string): PlayerState[] {
  return [...store.values()].filter(p => p.zoneId === zoneId);
}

export function updatePlayerLocation(
  userId: string,
  lat: number, lng: number, accuracy: number,
): void {
  const p = store.get(userId);
  if (!p) return;
  p.lat = lat; p.lng = lng; p.accuracy = accuracy;
  p.lastSeenAt = Date.now();
  // 실제 이동이 있으면 lastMoveAt 갱신
  p.lastMoveAt = Date.now();
}

/** socketId 바인딩 */
export function bindSocket(socketId: string, userId: string): void {
  socketToUser.set(socketId, userId);
}

export function unbindSocket(socketId: string): string | undefined {
  const uid = socketToUser.get(socketId);
  socketToUser.delete(socketId);
  return uid;
}

export function getUserIdBySocket(socketId: string): string | undefined {
  return socketToUser.get(socketId);
}
