"use strict";
/**
 * modules/drop/dropService.ts
 * 드랍 아이템 생성 서비스
 *
 * - 몬스터 사망 시 호출
 * - 실제 인벤토리 지급은 Firebase Functions 담당
 * - 게임 서버는 드랍 위치/아이템 정보만 관리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDrop = generateDrop;
const uuid_1 = require("uuid");
const dropStore_js_1 = require("./dropStore.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const constants_js_1 = require("../../config/constants.js");
const time_js_1 = require("../../lib/time.js");
const logger_js_1 = require("../../lib/logger.js");
/** 몬스터 타입별 드랍 테이블 (단순화) */
const DROP_TABLE = {
    goblin: [
        { itemId: '1', count: 1, chance: 0.8 },
        { itemId: '2', count: 1, chance: 0.3 },
    ],
    orc: [
        { itemId: '2', count: 1, chance: 0.6 },
        { itemId: '3', count: 1, chance: 0.4 },
    ],
    // 기본값 — 등록되지 않은 타입
    default: [
        { itemId: '1', count: 1, chance: 0.5 },
    ],
};
/** 몬스터 사망 시 드랍 생성 및 브로드캐스트 */
function generateDrop(monster) {
    const table = DROP_TABLE[monster.type] ?? DROP_TABLE.default;
    const t = (0, time_js_1.now)();
    for (const entry of table) {
        if (Math.random() > entry.chance)
            continue;
        const drop = {
            dropId: (0, uuid_1.v4)(),
            zoneId: monster.zoneId,
            monsterId: monster.monsterId,
            lat: monster.currentLat,
            lng: monster.currentLng,
            itemId: entry.itemId,
            count: entry.count,
            createdAt: t,
            expiresAt: t + constants_js_1.DROP_EXPIRE_MS,
            claimedBy: null,
        };
        (0, dropStore_js_1.setDrop)(drop);
        (0, clientSyncService_js_1.broadcastDropSpawned)(monster.zoneId, drop);
        logger_js_1.logger.debug('drop', `drop item=${entry.itemId} from ${monster.type}`);
    }
}
