/**
 * config/defaultWorldData.ts
 * 기본 월드 데이터 — 존 설정 + 스폰 포인트
 *
 * 운영 환경에서는 이 파일을 수정하거나
 * Firestore에서 불러오도록 확장한다
 *
 * ⚠️ 좌표는 예시값 (서울 여의도 공원 인근)
 *    실제 운영 시 현장 좌표로 교체 필요
 */

import { ZoneConfig } from '../types/zone.js';
import { MonsterSpawnPoint } from '../types/monster.js';

export function getDefaultWorldData(): {
  zones: ZoneConfig[];
  spawns: MonsterSpawnPoint[];
} {
  return {
    zones: [
      {
        zoneId:     'yeouido-a',
        name:       '여의도 공원 A',
        centerLat:  37.5282,
        centerLng:  126.9248,
        radiusM:    500,
        active:     true,
        tickRateMs: 1000,
      },
      {
        zoneId:     'yeouido-b',
        name:       '여의도 공원 B',
        centerLat:  37.5260,
        centerLng:  126.9270,
        radiusM:    500,
        active:     true,
        tickRateMs: 1000,
      },
    ],

    spawns: [
      // ── yeouido-a ─────────────────────────────────────
      {
        spawnId:        'spawn-ya-001',
        zoneId:         'yeouido-a',
        monsterType:    'goblin',
        lat:            37.5282,
        lng:            126.9248,
        respawnSeconds: 300,   // 5분
        maxCount:       3,
        active:         true,
        aggroRangeM:    50,
        attackRangeM:   20,
        moveSpeed:      1.2,   // m/s
        attackPower:    80,
        attackCooldownMs: 2000,
        maxHp:          500,
      },
      {
        spawnId:        'spawn-ya-002',
        zoneId:         'yeouido-a',
        monsterType:    'orc',
        lat:            37.5290,
        lng:            126.9255,
        respawnSeconds: 600,   // 10분
        maxCount:       1,
        active:         true,
        aggroRangeM:    80,
        attackRangeM:   25,
        moveSpeed:      0.8,
        attackPower:    200,
        attackCooldownMs: 3000,
        maxHp:          2000,
      },
      // ── yeouido-b ─────────────────────────────────────
      {
        spawnId:        'spawn-yb-001',
        zoneId:         'yeouido-b',
        monsterType:    'goblin',
        lat:            37.5260,
        lng:            126.9270,
        respawnSeconds: 300,
        maxCount:       2,
        active:         true,
        aggroRangeM:    50,
        attackRangeM:   20,
        moveSpeed:      1.2,
        attackPower:    80,
        attackCooldownMs: 2000,
        maxHp:          500,
      },
    ],
  };
}
