"use strict";
/**
 * modules/gateway/socketGateway.ts
 * Socket.io 서버 — 클라이언트 연결/이벤트 관리
 *
 * 역할
 * - 클라이언트 접속/해제 처리
 * - C2S 이벤트 수신 → 각 서비스로 위임
 * - S2C 이벤트 전송 API 제공
 *
 * disconnect grace period:
 * - 연결 끊김 즉시 세션 삭제 대신 DISCONNECT_GRACE_MS 동안 대기
 * - 유예 시간 안에 같은 userId로 재접속하면 세션 유지
 * - 유예 시간 초과 시 leaveZone 처리
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    이 파일 수정 후 반드시 game-server 폴더에서 별도 push
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketGateway = initSocketGateway;
exports.emitToZone = emitToZone;
exports.emitToSocket = emitToSocket;
exports.getSocketId = getSocketId;
exports.getUserId = getUserId;
exports.connectedCount = connectedCount;
const socket_io_1 = require("socket.io");
const env_js_1 = require("../../config/env.js");
const constants_js_1 = require("../../config/constants.js");
const logger_js_1 = require("../../lib/logger.js");
const eventNames_js_1 = require("./eventNames.js");
/** socketId → userId 매핑 */
const socketToUser = new Map();
/** userId → 재접속 유예 타이머 (disconnect 후 일정 시간 대기) */
const pendingDisconnects = new Map();
let io = null;
let _handlers = null;
function initSocketGateway(httpServer, handlers) {
    _handlers = handlers;
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_js_1.ENV.ALLOWED_ORIGINS,
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        logger_js_1.logger.info('gateway', `client connected: ${socket.id}`);
        socket.on(eventNames_js_1.C2S.PLAYER_JOIN, (data) => {
            // 재접속 유예 중이던 같은 userId → 타이머 취소, 세션 유지
            const pending = pendingDisconnects.get(data.userId);
            if (pending) {
                clearTimeout(pending.timer);
                socketToUser.delete(pending.socketId); // 구소켓 매핑 제거
                pendingDisconnects.delete(data.userId);
                logger_js_1.logger.info('gateway', `${data.userId} reconnected within grace period`);
            }
            socketToUser.set(socket.id, data.userId);
            socket.join(data.zoneId);
            handlers.onJoin(socket.id, data);
        });
        socket.on(eventNames_js_1.C2S.PLAYER_LOCATION, (data) => {
            handlers.onLocation(socket.id, data);
        });
        socket.on(eventNames_js_1.C2S.PLAYER_ATTACK, (data) => {
            handlers.onAttack(socket.id, data);
        });
        socket.on(eventNames_js_1.C2S.PLAYER_REVIVE, () => {
            handlers.onRevive(socket.id);
        });
        socket.on(eventNames_js_1.C2S.PLAYER_LEAVE, () => {
            handlers.onLeave(socket.id);
            socketToUser.delete(socket.id);
        });
        socket.on('disconnect', () => {
            const userId = socketToUser.get(socket.id);
            if (!userId)
                return;
            logger_js_1.logger.info('gateway', `client disconnected: ${socket.id} (${userId}), grace ${constants_js_1.DISCONNECT_GRACE_MS}ms`);
            // 유예 타이머 시작 — 시간 내 재접속하면 취소됨
            const timer = setTimeout(() => {
                pendingDisconnects.delete(userId);
                socketToUser.delete(socket.id);
                handlers.onLeave(socket.id);
                logger_js_1.logger.info('gateway', `grace expired: ${userId} removed`);
            }, constants_js_1.DISCONNECT_GRACE_MS);
            pendingDisconnects.set(userId, { socketId: socket.id, timer });
        });
    });
    logger_js_1.logger.info('gateway', 'Socket.io initialized');
    return io;
}
/** 특정 존 전체에 이벤트 전송 */
function emitToZone(zoneId, event, data) {
    io?.to(zoneId).emit(event, data);
}
/** 특정 소켓(유저)에게 이벤트 전송 */
function emitToSocket(socketId, event, data) {
    io?.to(socketId).emit(event, data);
}
/** 특정 userId의 socketId 조회 */
function getSocketId(userId) {
    for (const [sid, uid] of socketToUser.entries()) {
        if (uid === userId)
            return sid;
    }
    return undefined;
}
/** socketId → userId 조회 */
function getUserId(socketId) {
    return socketToUser.get(socketId);
}
/** 현재 연결된 소켓 수 */
function connectedCount() {
    return socketToUser.size;
}
