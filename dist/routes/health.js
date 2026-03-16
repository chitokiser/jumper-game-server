"use strict";
/**
 * routes/health.ts
 * 헬스체크 라우터 — Railway 생존 확인용
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socketGateway_js_1 = require("../modules/gateway/socketGateway.js");
const monsterInstanceStore_js_1 = require("../modules/monster/monsterInstanceStore.js");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    const monsters = (0, monsterInstanceStore_js_1.getAllMonsters)();
    res.json({
        status: 'ok',
        service: 'jumper-game-server',
        uptime: Math.floor(process.uptime()),
        players: (0, socketGateway_js_1.connectedCount)(),
        monsters: monsters.length,
        alive: monsters.filter(m => m.state !== 'dead' && m.state !== 'respawning').length,
    });
});
router.get('/', (_req, res) => {
    res.json({ name: 'jumper-game-server', version: '1.0.0' });
});
exports.default = router;
