/**
 * modules/world/worldEvents.ts
 * 월드 레벨 이벤트 버스
 *
 * 역할:
 * 1. 전역 이벤트 발행 (Node.js EventEmitter) — 모듈 간 느슨한 결합
 * 2. tick 내 이벤트 임시 수집 버퍼 — tick 종료 후 한 번에 gateway 전송
 *    (1차: 즉시 브로드캐스트 구조이므로 버퍼는 stats/디버그 용도)
 */

import { EventEmitter } from 'events';

// ── 전역 이벤트 버스 ─────────────────────────────────────────────────────────

export const worldEvents = new EventEmitter();
worldEvents.setMaxListeners(50);

export const WORLD_EVENT = {
  TICK:             'world:tick',
  ZONE_ACTIVATED:   'world:zone:activated',
  ZONE_DEACTIVATED: 'world:zone:deactivated',
  MONSTER_DIED:     'world:monster:died',
  MONSTER_SPAWNED:  'world:monster:spawned',
  PLAYER_DIED:      'world:player:died',
} as const;

// ── tick 이벤트 버퍼 ─────────────────────────────────────────────────────────
// tick 중 발생한 이벤트를 수집 → tick 종료 시 flush
// 현재는 통계/디버그 목적. delta 전송 방식으로 전환 시 gateway 연결 확장

export type TickEventType =
  | 'monster_update'
  | 'monster_died'
  | 'monster_respawned'
  | 'player_hit'
  | 'player_died'
  | 'drop_spawned';

export interface TickEvent {
  type:   TickEventType;
  zoneId: string;
  data:   Record<string, unknown>;
}

let tickBuffer: TickEvent[] = [];

/** tick 시작 시 버퍼 초기화 */
export function clearTickBuffer(): void {
  tickBuffer = [];
}

/** tick 중 이벤트 수집 */
export function pushTickEvent(event: TickEvent): void {
  tickBuffer.push(event);
}

/** tick 종료 시 수집된 이벤트 반환 후 초기화 */
export function flushTickBuffer(): TickEvent[] {
  const events = tickBuffer;
  tickBuffer = [];
  return events;
}

/** 현재 tick 버퍼 크기 (통계용) */
export function tickBufferSize(): number {
  return tickBuffer.length;
}
