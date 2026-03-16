"use strict";
/**
 * routes/admin.ts
 * 관리자 REST API
 *
 * 모든 엔드포인트는 X-Admin-Key 헤더로 인증.
 * Railway 환경변수 ADMIN_SECRET 과 일치해야 한다.
 *
 * GET  /admin/spawns                     — 전체 스폰 목록 + 실시간 인스턴스 현황
 * POST /admin/spawns                     — 스폰 포인트 추가 (즉시 인스턴스 생성)
 * DELETE /admin/spawns/:spawnId          — 스폰 제거 + 모든 인스턴스 강제 사망 broadcast
 * POST /admin/monsters/:monsterId/kill   — 특정 인스턴스 강제 사망
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("../lib/logger.js");
const spawnConfigLoader_js_1 = require("../modules/admin/spawnConfigLoader.js");
const monsterInstanceStore_js_1 = require("../modules/monster/monsterInstanceStore.js");
const monsterSpawnService_js_1 = require("../modules/monster/monsterSpawnService.js");
const monsterRespawnService_js_1 = require("../modules/monster/monsterRespawnService.js");
const clientSyncService_js_1 = require("../modules/gateway/clientSyncService.js");
const zoneManager_js_1 = require("../modules/zone/zoneManager.js");
const router = (0, express_1.Router)();
// ── 인증 미들웨어 ──────────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (!env_js_1.ENV.ADMIN_SECRET || key !== env_js_1.ENV.ADMIN_SECRET) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    next();
}
// ── GET /admin/spawns ─────────────────────────────────────────────────────────
// 전체 스폰 설정 + 각 스폰의 실시간 인스턴스 현황
router.get('/admin/spawns', adminAuth, (_req, res) => {
    const spawns = (0, spawnConfigLoader_js_1.getAllSpawnConfigs)();
    const monsters = (0, monsterInstanceStore_js_1.getAllMonsters)();
    const result = spawns.map(s => {
        const instances = monsters.filter(m => m.spawnId === s.spawnId);
        const alive = instances.filter(m => m.state !== 'dead' && m.state !== 'respawning').length;
        return {
            ...s,
            liveCount: alive,
            instances: instances.map(m => ({
                monsterId: m.monsterId,
                state: m.state,
                hp: m.hp,
                maxHp: m.maxHp,
                currentLat: m.currentLat,
                currentLng: m.currentLng,
                respawnAt: m.respawnAt,
            })),
        };
    });
    res.json({ spawns: result, total: result.length });
});
// ── POST /admin/spawns ────────────────────────────────────────────────────────
// 스폰 포인트 추가. zoneId 미제공 시 좌표 기준으로 자동 배정.
router.post('/admin/spawns', adminAuth, (req, res) => {
    const body = req.body;
    if (!body.monsterType || body.lat == null || body.lng == null) {
        res.status(400).json({ error: 'missing required: monsterType, lat, lng' });
        return;
    }
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    // zoneId 없으면 좌표 기준 가장 가까운 존 자동 배정
    const zoneId = body.zoneId || (0, zoneManager_js_1.findNearestZone)(lat, lng);
    if (!zoneId) {
        res.status(400).json({ error: 'no active zone found for these coordinates' });
        return;
    }
    const spawnId = body.spawnId || `spawn-admin-${(0, uuid_1.v4)().slice(0, 8)}`;
    const spawn = {
        spawnId,
        zoneId,
        monsterType: String(body.monsterType),
        lat,
        lng,
        respawnSeconds: Number(body.respawnSeconds) || 120,
        maxCount: Number(body.maxCount) || 1,
        active: body.active !== false,
        aggroRangeM: Number(body.aggroRangeM) || 300,
        attackRangeM: Number(body.attackRangeM) || 100,
        moveSpeed: Number(body.moveSpeed) || 1.0,
        attackPower: Number(body.attackPower) || 25,
        attackCooldownMs: Number(body.attackCooldownMs) || 2000,
        maxHp: Number(body.maxHp) || 300,
    };
    (0, spawnConfigLoader_js_1.addSpawnConfig)(spawn);
    const created = (0, monsterSpawnService_js_1.fillSpawnPoint)(spawn);
    // 신규 스폰 즉시 브로드캐스트 — 이미 접속한 플레이어가 바로 볼 수 있도록
    const newInstances = (0, monsterInstanceStore_js_1.getMonstersBySpawn)(spawnId);
    for (const m of newInstances) {
        (0, clientSyncService_js_1.broadcastMonsterUpdate)(m.zoneId, m);
    }
    logger_js_1.logger.info('adminRoute', `[admin] POST /admin/spawns → ${spawnId} (${spawn.monsterType} zone:${zoneId}) instances:${created}`);
    res.json({ spawnId, zoneId, instancesCreated: created, spawn });
});
// ── DELETE /admin/spawns/:spawnId ─────────────────────────────────────────────
// 스폰 제거 + 모든 인스턴스 강제 사망 broadcast (클라이언트 즉시 정리)
router.delete('/admin/spawns/:spawnId', adminAuth, (req, res) => {
    const { spawnId } = req.params;
    const spawn = (0, spawnConfigLoader_js_1.getSpawnConfig)(spawnId);
    if (!spawn) {
        res.status(404).json({ error: `spawn not found: ${spawnId}` });
        return;
    }
    // 1. 인스턴스를 먼저 죽음 broadcast (클라가 마커 제거하도록)
    const instances = (0, monsterInstanceStore_js_1.getMonstersBySpawn)(spawnId);
    for (const m of instances) {
        (0, clientSyncService_js_1.broadcastMonsterDied)(m.zoneId, m.monsterId);
    }
    // 2. 메모리에서 인스턴스 제거
    const removed = (0, monsterInstanceStore_js_1.removeMonstersBySpawn)(spawnId);
    // 3. 스폰 설정 제거
    (0, spawnConfigLoader_js_1.removeSpawnConfig)(spawnId);
    logger_js_1.logger.info('adminRoute', `[admin] DELETE /admin/spawns/${spawnId} → removed ${removed.length} instances`);
    res.json({ spawnId, removed: true, instancesRemoved: removed.length });
});
// ── POST /admin/monsters/:monsterId/kill ──────────────────────────────────────
// 특정 인스턴스 강제 사망 (스폰 설정은 유지 → respawn 후 부활)
router.post('/admin/monsters/:monsterId/kill', adminAuth, (req, res) => {
    const { monsterId } = req.params;
    const monster = (0, monsterInstanceStore_js_1.getMonster)(monsterId);
    if (!monster) {
        res.status(404).json({ error: `monster not found: ${monsterId}` });
        return;
    }
    if (monster.state === 'dead' || monster.state === 'respawning') {
        res.json({ monsterId, killed: false, reason: 'already dead' });
        return;
    }
    // 스폰 설정에서 respawnSeconds 참조
    const spawnCfg = (0, spawnConfigLoader_js_1.getSpawnConfig)(monster.spawnId);
    const respawnSecs = spawnCfg?.respawnSeconds ?? 120;
    const dead = (0, monsterRespawnService_js_1.markAsDead)(monster, respawnSecs);
    (0, clientSyncService_js_1.broadcastMonsterDied)(dead.zoneId, dead.monsterId);
    logger_js_1.logger.info('adminRoute', `[admin] kill ${monsterId} (${monster.type}), respawnIn=${respawnSecs}s`);
    res.json({ monsterId, killed: true, respawnSeconds: respawnSecs });
});
exports.default = router;
