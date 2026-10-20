"use strict";
/**
 * modules/exp/expService.ts
 * 게임서버 EXP/레벨업 시스템
 *
 * - EXP 출처: 몬스터 maxHp (서버 기준, 클라이언트 신뢰 불가)
 * - 레벨업 공식: (currentLevel + 1)² × 100,000
 * - 온체인 EXP와 완전 독립: Firestore battle_players.{gsExp, gsLevel}
 * - 레벨 상한: 99
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcNextLevelExp = calcNextLevelExp;
exports.awardExpOnKill = awardExpOnKill;
exports.loadExpFromFirestore = loadExpFromFirestore;
const admin = __importStar(require("firebase-admin"));
const playerStateStore_js_1 = require("../player/playerStateStore.js");
const socketGateway_js_1 = require("../gateway/socketGateway.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const i18n_js_1 = require("../../lib/i18n.js");
const firebaseAdmin_js_1 = require("../../lib/firebaseAdmin.js");
const logger_js_1 = require("../../lib/logger.js");
const LEVEL_CAP = 99;
const MAX_EXP_PER_KILL = 100000;
const MAX_TOTAL_EXP = LEVEL_CAP * LEVEL_CAP * MAX_EXP_PER_KILL;
function calcNextLevelExp(currentLevel) {
    return Math.pow(currentLevel + 1, 2) * 100000;
}
/** 몬스터 처치 시 EXP 지급 (동기, fire-and-forget Firestore) */
function awardExpOnKill(userId, monsterMaxHp) {
    const player = (0, playerStateStore_js_1.getPlayer)(userId);
    if (!player || player.state !== 'alive')
        return;
    const expGain = Math.min(monsterMaxHp, MAX_EXP_PER_KILL);
    const newExp = Math.min(MAX_TOTAL_EXP, player.exp + expGain);
    let currentLevel = player.level;
    const levelUpList = [];
    while (currentLevel < LEVEL_CAP) {
        const needed = calcNextLevelExp(currentLevel);
        if (newExp < needed)
            break;
        currentLevel++;
        levelUpList.push(currentLevel);
    }
    (0, playerStateStore_js_1.setPlayer)({ ...player, exp: newExp, level: currentLevel });
    const socketId = (0, socketGateway_js_1.getSocketId)(userId);
    if (socketId) {
        const lang = (0, playerStateStore_js_1.getLangBySocket)(socketId);
        (0, clientSyncService_js_1.sendNotify)(socketId, (0, i18n_js_1.t)(lang, 'exp_gained', expGain));
        for (const lv of levelUpList) {
            (0, clientSyncService_js_1.sendPlayerLevelUp)(socketId, lv, newExp, calcNextLevelExp(lv));
            (0, clientSyncService_js_1.sendNotify)(socketId, (0, i18n_js_1.t)(lang, 'level_up', lv));
        }
        (0, clientSyncService_js_1.sendPlayerExpUpdate)(socketId, currentLevel, newExp, calcNextLevelExp(currentLevel));
    }
    persistExpToFirestore(userId, currentLevel, newExp - player.exp).catch(e => logger_js_1.logger.warn('expService', `Firestore EXP 저장 실패: ${e}`));
}
// 경험치는 더하기(increment)로 저장 — 화면(배치 몬스터 처치)도 같은 칸에 더하므로 덮어쓰면 안 된다 (2026-10-20)
async function persistExpToFirestore(userId, level, expGain) {
    if (userId === 'anonymous' || expGain <= 0)
        return;
    const db = (0, firebaseAdmin_js_1.getFirestore)();
    if (!db)
        return;
    await db.collection('battle_players').doc(userId).set({ gsExp: admin.firestore.FieldValue.increment(expGain), gsLevel: level, updatedAt: new Date() }, { merge: true });
}
/** 접속 시 Firestore에서 EXP/레벨 복원 */
async function loadExpFromFirestore(userId) {
    if (userId === 'anonymous')
        return { exp: 0, level: 1 };
    const db = (0, firebaseAdmin_js_1.getFirestore)();
    if (!db)
        return { exp: 0, level: 1 };
    try {
        const snap = await db.collection('battle_players').doc(userId).get();
        if (!snap.exists)
            return { exp: 0, level: 1 };
        const d = snap.data();
        return {
            exp: typeof d.gsExp === 'number' ? d.gsExp : 0,
            level: typeof d.gsLevel === 'number' ? d.gsLevel : 1,
        };
    }
    catch {
        return { exp: 0, level: 1 };
    }
}
