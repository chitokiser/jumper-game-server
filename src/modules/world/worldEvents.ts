/**
 * modules/world/worldEvents.ts
 * 월드 레벨 이벤트 버스 (Node.js EventEmitter 기반)
 */

import { EventEmitter } from 'events';

export const worldEvents = new EventEmitter();
worldEvents.setMaxListeners(50);

export const WORLD_EVENT = {
  TICK:            'world:tick',
  ZONE_ACTIVATED:  'world:zone:activated',
  ZONE_DEACTIVATED:'world:zone:deactivated',
  MONSTER_DIED:    'world:monster:died',
  MONSTER_SPAWNED: 'world:monster:spawned',
  PLAYER_DIED:     'world:player:died',
} as const;
