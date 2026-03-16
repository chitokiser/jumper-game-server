/**
 * modules/player/playerSessionManager.ts
 * 플레이어 세션 관리 — 입장/퇴장/위치 업데이트/타임아웃/부활
 *
 * 설계 원칙:
 * - 위치는 클라이언트가 보고하되 accuracy로 신뢰도 보정
 * - 30초간 업데이트 없으면 자동 퇴장
 */

import { PlayerState } from '../../types/player.js';
import {
  setPlayer, getPlayer, removePlayer, getAllPlayers,
  updatePlayerLocation, updatePlayerSeenAt, bindSocket, unbindSocket, getUserIdBySocket,
} from './playerStateStore.js';
import { playerEnterZone, playerLeaveZone, resolveZoneId } from '../zone/zoneManager.js';
import { sendZoneSnapshot, sendPlayerRevived } from '../gateway/clientSyncService.js';
import { getSocketId } from '../gateway/socketGateway.js';
import { getMonstersByZone } from '../monster/monsterInstanceStore.js';
import { isTeleport } from './playerResolver.js';
import { HP_PER_LEVEL, MP_PER_LEVEL, PLAYER_TIMEOUT_MS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';
import { now } from '../../lib/time.js';

/** 플레이어 입장 */
export function joinZone(socketId: string, data: {
  userId: string; zoneId: string;
  lat: number; lng: number; accuracy: number; level: number;
}): void {
  const { userId, lat, lng, accuracy, level } = data;

  // zone 유효성 검사: 존재 여부 + 좌표 범위 → 필요 시 가장 가까운 존으로 재배정
  const zoneId = resolveZoneId(data.zoneId, lat, lng) ?? data.zoneId;

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
    state: existing?.state === 'dead' ? 'dead' : 'alive',  // 사망 상태 유지
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

/** 위치 업데이트 (순간이동 감지 시 1회 보류) */
export function updateLocation(socketId: string, data: {
  lat: number; lng: number; accuracy: number;
}): void {
  const userId = getUserIdBySocket(socketId);
  if (!userId) return;

  const player = getPlayer(userId);
  if (!player) return;

  // 순간이동 감지: 위치 무시, lastSeenAt만 갱신
  const elapsed = now() - player.lastMoveAt;
  if (isTeleport({ lat: player.lat, lng: player.lng }, data, elapsed)) {
    logger.debug('playerSession', `${userId}: teleport ignored (${Math.round(elapsed)}ms, acc=${data.accuracy}m)`);
    updatePlayerSeenAt(userId);
    return;
  }

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

/**
 * 부활 처리 — C2S player:revive 수신 시 호출
 * dead 상태 플레이어를 alive로 전환, HP 30% 복구
 */
export function revivePlayer(socketId: string): void {
  const userId = getUserIdBySocket(socketId);
  if (!userId) return;

  const player = getPlayer(userId);
  if (!player || player.state !== 'dead') return;

  const revivedHp = Math.max(1, Math.floor(player.maxHp * 0.3));
  const updated: PlayerState = {
    ...player,
    hp:    revivedHp,
    state: 'alive',
    lastSeenAt: now(),
  };
  setPlayer(updated);

  sendPlayerRevived(socketId, revivedHp);
  logger.info('playerSession', `${userId} revived (hp=${revivedHp})`);
}

/** 타임아웃된 플레이어 정리 (WorldEngine tick에서 호출) */
export function sweepTimedOutPlayers(): string[] {
  const t = now();
  const timedOut: string[] = [];

  for (const player of getAllPlayers()) {
    if (t - player.lastSeenAt > PLAYER_TIMEOUT_MS) {
      playerLeaveZone(player.userId, player.zoneId);
      removePlayer(player.userId);
      timedOut.push(player.userId);
      logger.info('playerSession', `timeout: ${player.userId} (no update for ${PLAYER_TIMEOUT_MS}ms)`);
    }
  }

  return timedOut;
}
