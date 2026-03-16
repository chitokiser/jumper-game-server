/**
 * modules/gateway/socketGateway.ts
 * Socket.io 서버 — 클라이언트 연결/이벤트 관리
 *
 * 역할
 * - 클라이언트 접속/해제 처리
 * - C2S 이벤트 수신 → 각 서비스로 위임
 * - S2C 이벤트 전송 API 제공
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    이 파일 수정 후 반드시 game-server 폴더에서 별도 push
 */

import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { ENV } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { C2S, S2C } from './eventNames.js';

// 순환 참조 방지를 위해 서비스는 주입 방식으로 연결
export type GatewayHandlers = {
  onJoin:     (socketId: string, data: JoinPayload)     => void;
  onLocation: (socketId: string, data: LocationPayload) => void;
  onLeave:    (socketId: string)                        => void;
  onAttack:   (socketId: string, data: AttackPayload)   => void;
};

export interface JoinPayload {
  userId: string; zoneId: string;
  lat: number; lng: number; accuracy: number; level: number;
}
export interface LocationPayload {
  lat: number; lng: number; accuracy: number;
}
export interface AttackPayload {
  monsterId: string;
}

/** socketId → userId 매핑 */
const socketToUser = new Map<string, string>();

let io: IOServer | null = null;

export function initSocketGateway(httpServer: HttpServer, handlers: GatewayHandlers): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: ENV.ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info('gateway', `client connected: ${socket.id}`);

    socket.on(C2S.PLAYER_JOIN, (data: JoinPayload) => {
      socketToUser.set(socket.id, data.userId);
      socket.join(data.zoneId); // Socket.io room = zone
      handlers.onJoin(socket.id, data);
    });

    socket.on(C2S.PLAYER_LOCATION, (data: LocationPayload) => {
      handlers.onLocation(socket.id, data);
    });

    socket.on(C2S.PLAYER_ATTACK, (data: AttackPayload) => {
      handlers.onAttack(socket.id, data);
    });

    socket.on(C2S.PLAYER_LEAVE, () => {
      handlers.onLeave(socket.id);
      socketToUser.delete(socket.id);
    });

    socket.on('disconnect', () => {
      logger.info('gateway', `client disconnected: ${socket.id}`);
      handlers.onLeave(socket.id);
      socketToUser.delete(socket.id);
    });
  });

  logger.info('gateway', 'Socket.io initialized');
  return io;
}

/** 특정 존 전체에 이벤트 전송 */
export function emitToZone(zoneId: string, event: string, data: unknown): void {
  io?.to(zoneId).emit(event, data);
}

/** 특정 소켓(유저)에게 이벤트 전송 */
export function emitToSocket(socketId: string, event: string, data: unknown): void {
  io?.to(socketId).emit(event, data);
}

/** 특정 userId의 socketId 조회 */
export function getSocketId(userId: string): string | undefined {
  for (const [sid, uid] of socketToUser.entries()) {
    if (uid === userId) return sid;
  }
  return undefined;
}

/** socketId → userId 조회 */
export function getUserId(socketId: string): string | undefined {
  return socketToUser.get(socketId);
}

/** 현재 연결된 소켓 수 */
export function connectedCount(): number {
  return socketToUser.size;
}
