"use strict";
/**
 * modules/world/worldEngine.ts
 * 월드 엔진 — 서버의 심장
 *
 * 매 tick마다:
 *   1. 모든 활성 존 순회
 *   2. 리스폰 검사 (플레이어 없는 존도 실행)
 *   3. 플레이어가 있는 존만 풀 tick:
 *      - AI 상태 갱신
 *      - 전투 판정
 *   4. 만료 드랍 정리 (60틱마다)
 *   5. 타임아웃 플레이어 정리 (30틱마다)
 *
 * 설계 원칙:
 * - zone A의 에러가 zone B tick을 멈추지 않는다 (per-zone try/catch)
 * - 플레이어 없는 zone은 AI/전투 스킵 (리스폰만 수행)
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorldEngine = startWorldEngine;
exports.stopWorldEngine = stopWorldEngine;
const tickRunner_js_1 = require("./tickRunner.js");
const worldEvents_js_1 = require("./worldEvents.js");
const zoneManager_js_1 = require("../zone/zoneManager.js");
const monsterInstanceStore_js_1 = require("../monster/monsterInstanceStore.js");
const playerStateStore_js_1 = require("../player/playerStateStore.js");
const monsterAiService_js_1 = require("../monster/monsterAiService.js");
const monsterRespawnService_js_1 = require("../monster/monsterRespawnService.js");
const combatResolver_js_1 = require("../combat/combatResolver.js");
const dropStore_js_1 = require("../drop/dropStore.js");
const playerSessionManager_js_1 = require("../player/playerSessionManager.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const constants_js_1 = require("../../config/constants.js");
const logger_js_1 = require("../../lib/logger.js");
let ticker = null;
let dropSweepCounter = 0;
let playerSweepCounter = 0;
const DROP_SWEEP_EVERY = 60;
function startWorldEngine() {
    if (ticker)
        return;
    ticker = new tickRunner_js_1.TickRunner('world', constants_js_1.DEFAULT_TICK_MS, async (deltaMs) => {
        await worldTick(deltaMs);
    });
    ticker.start();
    logger_js_1.logger.info('worldEngine', '▶ World Engine started');
}
function stopWorldEngine() {
    ticker?.stop();
    ticker = null;
    logger_js_1.logger.info('worldEngine', '■ World Engine stopped');
}
async function worldTick(deltaMs) {
    const tickStart = Date.now();
    (0, worldEvents_js_1.clearTickBuffer)();
    // 1. 리스폰 검사 (전 존 공통 — 플레이어 없어도 실행)
    (0, monsterRespawnService_js_1.tickRespawn)();
    // 2. 활성 존 순회 (per-zone 에러 격리)
    const zones = (0, zoneManager_js_1.getActiveZones)();
    let activeZoneCount = 0;
    for (const zoneId of zones) {
        const active = (0, zoneManager_js_1.isZoneActive)(zoneId);
        if (active)
            activeZoneCount++;
        try {
            const monsters = (0, monsterInstanceStore_js_1.getMonstersByZone)(zoneId);
            // AI 상태 갱신 — 플레이어 없는 존도 실행
            // (플레이어 퇴장 후 attacking/chasing 상태가 고착되는 것을 방지)
            for (const m of monsters) {
                const updated = (0, monsterAiService_js_1.tickMonsterAi)(m, deltaMs);
                if (updated !== m) {
                    (0, monsterInstanceStore_js_1.setMonster)(updated);
                    // 비활성 존도 상태 전환(attacking→return 등)은 broadcast — 재접속 시 stale 방지
                    const stateChanged = updated.state !== m.state;
                    if (active || stateChanged)
                        (0, clientSyncService_js_1.broadcastMonsterUpdate)(zoneId, updated);
                }
            }
            // 전투 판정 — 플레이어가 있는 존만
            if (active)
                (0, combatResolver_js_1.tickCombat)(zoneId);
        }
        catch (err) {
            logger_js_1.logger.error('worldEngine', `zone tick error [${zoneId}]`, err);
        }
    }
    // 3. 드랍 만료 정리 (60틱마다)
    dropSweepCounter++;
    if (dropSweepCounter >= DROP_SWEEP_EVERY) {
        const removed = (0, dropStore_js_1.sweepExpiredDrops)();
        if (removed > 0)
            logger_js_1.logger.debug('worldEngine', `swept ${removed} expired drops`);
        dropSweepCounter = 0;
    }
    // 4. 타임아웃 플레이어 정리 (30틱마다)
    playerSweepCounter++;
    if (playerSweepCounter >= constants_js_1.PLAYER_SWEEP_EVERY) {
        const removed = (0, playerSessionManager_js_1.sweepTimedOutPlayers)();
        if (removed.length > 0)
            logger_js_1.logger.info('worldEngine', `swept ${removed.length} timed-out players`);
        playerSweepCounter = 0;
    }
    // 5. tick 성능 로그
    const elapsed = Date.now() - tickStart;
    const events = (0, worldEvents_js_1.flushTickBuffer)();
    const totalPlayers = (0, playerStateStore_js_1.getAllPlayers)().length;
    const totalMonsters = (0, monsterInstanceStore_js_1.getAllMonsters)().filter(m => m.state !== 'dead').length;
    if (elapsed > constants_js_1.DEFAULT_TICK_MS * 0.8) {
        // tick이 주기의 80% 이상 소요되면 경고
        logger_js_1.logger.warn('worldEngine', `slow tick: ${elapsed}ms | zones=${activeZoneCount}/${zones.length} players=${totalPlayers} monsters=${totalMonsters} events=${events.length}`);
    }
    else {
        logger_js_1.logger.debug('worldEngine', `tick ${elapsed}ms | zones=${activeZoneCount}/${zones.length} players=${totalPlayers} monsters=${totalMonsters} events=${events.length}`);
    }
}
