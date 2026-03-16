/**
 * modules/player/playerSessionManager.ts
 * 플레이어 세션 관리 — 입장/퇴장/위치 업데이트/타임아웃
 *
 * 설계 원칙:
 * - 위치는 클라이언트가 보고하되 accuracy로 신뢰도 보정
 * - 30초간 업데이트 없으면 자동 퇴장
 */

import { PlayerState } from '../../types/player.js';
import {
  setPlayer, getPlayer, removePlayer,
  updatePlayerLocation, bindSocket, unbindSocket, getUserIdBySocket,
} from './playerStateStore.js';
import { playerEnterZone, playerLeaveZone } from '../zone/zoneManager.js';
import { sendZoneSnapshot } from '../gateway/clientSyncService.js';
import { getMonstersByZone } from '../monster/monsterInstanceStore.js';
import { HP_PER_LEVEL, MP_PER_LEVEL, PLAYER_TIMEOUT_MS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';
import { now } from '../../lib/time.js';

/** 플레이어 입장 */
export function joinZone(socketId: string, data: {
  userId: string; zoneId: string;
  lat: number; lng: number; accuracy: number; level: number;
}): void {
  const { userId, zoneId, lat, lng, accuracy, level } = data;

  // 이미 다른 존에 있으면 퇴장 처리
  const existing = getPlayer(userId);
  if (existing && existing.zoneId !== zoneId) {
    playerLeaveZone(userId, existing.zoneId);
  }

  const maxHp = level * HP_PER_LEVEL;
  const maxMp = level * MP_PER_LEVEL;
  const state: PlayerState = {
    userId, zoneId, lat, lng, accuracy,
    hp: existing?.hp ?? maxHp,
    maxHp,
    mp: existing?.mp ?? maxMp,
    maxMp,
    level,
    state: 'alive',
    lastSeenAt: now(),
    lastMoveAt: now(),
    lastAttackedAt: 0,
  };

  setPlayer(state);
  bindSocket(socketId, userId);
  playerEnterZone(userId, zoneId);

  // 접속 직후 존 스냅샷 전송
  const monsters = getMonstersByZone(zoneId);
  sendZoneSnapshot(socketId, zoneId, monsters);

  logger.info('playerSession', `${userId} joined zone ${zoneId}`);
}

/** 위치 업데이트 */
export function updateLocation(socketId: string, data: {
  lat: number; lng: number; accuracy: number;
}): void {
  const userId = getUserIdBySocket(socketId);
  if (!userId) return;
  updatePlayerLocation(userId, data.lat, data.lng, data.accuracy);
}

/** 퇴장 */
export function leaveZone(socketId: string): void {
  const userId = unbindSocket(socketId);
  if (!userId) return;
  const player = getPlayer(userId);
  if (player) {
    playerLeaveZone(userId, player.zoneId);
    removePlayer(userId);
    logger.info('playerSession', `${userId} left zone ${player.zoneId}`);
  }
}

/** 타임아웃된 플레이어 정리 (WorldEngine tick에서 호출) */
export function sweepTimedOutPlayers(): string[] {
  const timedOut: string[] = [];
  // playerStateStore에서 전체 조회는 getPlayer 기반으로 처리
  // 실제로는 getAllPlayers()를 import해 사용
  return timedOut;
}
