"use strict";
/**
 * modules/drop/dropService.ts
 * 드랍 아이템 생성 서비스
 *
 * - 몬스터 사망 시 호출
 * - 게임 서버는 코인 드랍 위치/금액 관리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDrop = generateDrop;
exports.collectDrop = collectDrop;
const uuid_1 = require("uuid");
const dropStore_js_1 = require("./dropStore.js");
const clientSyncService_js_1 = require("../gateway/clientSyncService.js");
const playerStateStore_js_1 = require("../player/playerStateStore.js");
const i18n_js_1 = require("../../lib/i18n.js");
const constants_js_1 = require("../../config/constants.js");
const time_js_1 = require("../../lib/time.js");
const logger_js_1 = require("../../lib/logger.js");
/** 몬스터 타입별 코인 드랍 범위 [min, max] */
const COIN_DROP = {
    goblin: [5, 15],
    pirate: [10, 25],
    pirate2: [20, 40],
    pirate3: [35, 60],
    orc: [25, 45],
    orc2: [50, 80],
    orc3: [80, 120],
    dragon: [200, 350],
    default: [5, 20],
};
function randCoin(type) {
    const [min, max] = COIN_DROP[type] ?? COIN_DROP.default;
    return Math.floor(min + Math.random() * (max - min + 1));
}
/** 몬스터 사망 시 코인 드랍 생성 및 브로드캐스트 */
function generateDrop(monster) {
    const gold = randCoin(monster.type);
    const t = (0, time_js_1.now)();
    const drop = {
        dropId: (0, uuid_1.v4)(),
        zoneId: monster.zoneId,
        monsterId: monster.monsterId,
        lat: monster.currentLat + (Math.random() - 0.5) * 0.00003,
        lng: monster.currentLng + (Math.random() - 0.5) * 0.00003,
        itemId: 'gold',
        count: gold,
        gold,
        createdAt: t,
        expiresAt: t + constants_js_1.DROP_EXPIRE_MS,
        claimedBy: null,
    };
    (0, dropStore_js_1.setDrop)(drop);
    (0, clientSyncService_js_1.broadcastDropSpawned)(monster.zoneId, drop);
    logger_js_1.logger.debug('drop', `coin drop ${gold} from ${monster.type}`);
}
function collectDrop(socketId, dropId) {
    const drop = (0, dropStore_js_1.getDrop)(dropId);
    if (!drop || drop.claimedBy)
        return;
    drop.claimedBy = socketId;
    (0, dropStore_js_1.removeDrop)(dropId);
    (0, clientSyncService_js_1.broadcastDropRemoved)(drop.zoneId, dropId);
    const gold = drop.gold ?? drop.count;
    (0, clientSyncService_js_1.sendDropCollected)(socketId, dropId, gold);
    (0, clientSyncService_js_1.sendNotify)(socketId, (0, i18n_js_1.t)((0, playerStateStore_js_1.getLangBySocket)(socketId), 'drop_gold', gold));
    logger_js_1.logger.debug('drop', `drop ${dropId} collected, gold=${gold}`);
}
