"use strict";
/**
 * src/index.ts
 * 서버 진입점
 *
 * 부팅 순서:
 *   1. 환경변수 로드
 *   2. 월드 데이터 로드 (존 + 스폰 설정)
 *   3. Express + Socket.io 서버 시작
 *   4. 초기 몬스터 스폰
 *   5. World Engine 시작 (tick 시작)
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    이 파일 수정 후 반드시:
 *    cd game-server && git add . && git commit && git push origin main
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_js_1 = __importDefault(require("./app.js"));
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./lib/logger.js");
const firebaseAdmin_js_1 = require("./lib/firebaseAdmin.js");
// ── 월드 데이터 로드 ──────────────────────────────────────────────────────────
const spawnConfigLoader_js_1 = require("./modules/admin/spawnConfigLoader.js");
const zoneRegistry_js_1 = require("./modules/zone/zoneRegistry.js");
const monsterSpawnService_js_1 = require("./modules/monster/monsterSpawnService.js");
const defaultWorldData_js_1 = require("./config/defaultWorldData.js");
// ── Socket.io 게이트웨이 ───────────────────────────────────────────────────────
const socketGateway_js_1 = require("./modules/gateway/socketGateway.js");
const playerSessionManager_js_1 = require("./modules/player/playerSessionManager.js");
const combatResolver_js_1 = require("./modules/combat/combatResolver.js");
// ── World Engine ──────────────────────────────────────────────────────────────
const worldEngine_js_1 = require("./modules/world/worldEngine.js");
async function bootstrap() {
    // 1. Firebase Admin 초기화 (스폰 영구저장용)
    (0, firebaseAdmin_js_1.initFirebaseAdmin)();
    // 2. 월드 데이터 로드
    const worldData = (0, defaultWorldData_js_1.getDefaultWorldData)();
    (0, spawnConfigLoader_js_1.loadSpawnConfig)(worldData);
    for (const zone of (0, spawnConfigLoader_js_1.getLoadedZoneConfigs)()) {
        (0, zoneRegistry_js_1.registerZone)(zone);
    }
    logger_js_1.logger.info('bootstrap', `loaded ${(0, spawnConfigLoader_js_1.getLoadedZoneConfigs)().length} zones`);
    // 2-1. Firestore에서 admin 스폰 복원 (서버 재시작 시 orc/pirate 등 유지)
    await (0, spawnConfigLoader_js_1.loadAdminSpawnsFromFirestore)();
    // 3. HTTP + Socket.io 서버 생성
    const httpServer = (0, http_1.createServer)(app_js_1.default);
    (0, socketGateway_js_1.initSocketGateway)(httpServer, {
        onJoin: (socketId, data) => (0, playerSessionManager_js_1.joinZone)(socketId, data),
        onLocation: (socketId, data) => (0, playerSessionManager_js_1.updateLocation)(socketId, data),
        onLeave: (socketId) => (0, playerSessionManager_js_1.leaveZone)(socketId),
        onAttack: (socketId, data) => {
            const userId = (0, socketGateway_js_1.getUserId)(socketId);
            if (userId)
                (0, combatResolver_js_1.resolvePlayerAttack)(userId, data.monsterId);
        },
        onRevive: (socketId) => (0, playerSessionManager_js_1.revivePlayer)(socketId),
    });
    // 3. 서버 시작
    httpServer.listen(env_js_1.ENV.PORT, () => {
        logger_js_1.logger.info('bootstrap', `✅ jumper-game-server running on port ${env_js_1.ENV.PORT}`);
        logger_js_1.logger.info('bootstrap', `   GET /health  →  status check`);
        logger_js_1.logger.info('bootstrap', `   Socket.io     →  ws://localhost:${env_js_1.ENV.PORT}`);
    });
    // 4. 초기 몬스터 스폰
    (0, monsterSpawnService_js_1.initAllSpawns)((0, spawnConfigLoader_js_1.getAllSpawnConfigs)());
    // 5. World Engine 시작
    (0, worldEngine_js_1.startWorldEngine)();
}
bootstrap().catch(err => {
    logger_js_1.logger.error('bootstrap', 'fatal error', err);
    process.exit(1);
});
