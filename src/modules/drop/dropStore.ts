/**
 * modules/drop/dropStore.ts
 * 드랍 아이템 인메모리 저장소
 */

import { DropInstance } from '../../types/drop.js';

const store = new Map<string, DropInstance>();

export function setDrop(d: DropInstance): void {
  store.set(d.dropId, d);
}

export function getDrop(dropId: string): DropInstance | undefined {
  return store.get(dropId);
}

export function removeDrop(dropId: string): void {
  store.delete(dropId);
}

export function getDropsByZone(zoneId: string): DropInstance[] {
  return [...store.values()].filter(d => d.zoneId === zoneId && !d.claimedBy);
}

/** 만료된 드랍 정리 */
export function sweepExpiredDrops(): number {
  const t = Date.now();
  let count = 0;
  for (const [id, d] of store.entries()) {
    if (t > d.expiresAt) { store.delete(id); count++; }
  }
  return count;
}
