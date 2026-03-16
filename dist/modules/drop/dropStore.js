"use strict";
/**
 * modules/drop/dropStore.ts
 * 드랍 아이템 인메모리 저장소
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDrop = setDrop;
exports.getDrop = getDrop;
exports.removeDrop = removeDrop;
exports.getDropsByZone = getDropsByZone;
exports.sweepExpiredDrops = sweepExpiredDrops;
const store = new Map();
function setDrop(d) {
    store.set(d.dropId, d);
}
function getDrop(dropId) {
    return store.get(dropId);
}
function removeDrop(dropId) {
    store.delete(dropId);
}
function getDropsByZone(zoneId) {
    return [...store.values()].filter(d => d.zoneId === zoneId && !d.claimedBy);
}
/** 만료된 드랍 정리 */
function sweepExpiredDrops() {
    const t = Date.now();
    let count = 0;
    for (const [id, d] of store.entries()) {
        if (t > d.expiresAt) {
            store.delete(id);
            count++;
        }
    }
    return count;
}
