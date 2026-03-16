/**
 * config/defaultWorldData.ts
 * 기본 월드 데이터 — 존 설정 + 스폰 포인트
 *
 * 운영 환경에서는 이 파일을 수정하거나
 * Firestore에서 불러오도록 확장한다
 *
 * ⚠️ 좌표: 하노이 Vinhomes Ocean Park / Ecopark 인근
 *    현장 실측 후 정밀 좌표로 교체 필요
 */

import { ZoneConfig } from '../types/zone.js';
import { MonsterSpawnPoint } from '../types/monster.js';

export function getDefaultWorldData(): {
  zones: ZoneConfig[];
  spawns: MonsterSpawnPoint[];
} {
  return {
    zones: [
      // ── Vinhomes Ocean Park Zone A (서쪽 구역) ──────────────────────────────
      {
        zoneId:     'oceanpark-a',
        name:       'Ocean Park A',
        centerLat:  20.9716,
        centerLng:  105.9366,
        radiusM:    500,
        active:     true,
        tickRateMs: 1000,
      },
      // ── Vinhomes Ocean Park Zone B (동쪽 구역) ──────────────────────────────
      {
        zoneId:     'oceanpark-b',
        name:       'Ocean Park B',
        centerLat:  20.9650,
        centerLng:  105.9420,
        radiusM:    500,
        active:     true,
        tickRateMs: 1000,
      },
      // ── Ecopark Zone A ───────────────────────────────────────────────────────
      {
        zoneId:     'ecopark-a',
        name:       'Eco Park A',
        centerLat:  20.9430,
        centerLng:  105.9748,
        radiusM:    600,
        active:     true,
        tickRateMs: 1000,
      },
    ],

    spawns: [
      // ── oceanpark-a ─────────────────────────────────────────────────────────
      {
        spawnId:          'spawn-opa-001',
        zoneId:           'oceanpark-a',
        monsterType:      'goblin',
        lat:              20.9716,
        lng:              105.9366,
        respawnSeconds:   300,   // 5분
        maxCount:         3,
        active:           true,
        aggroRangeM:      50,
        attackRangeM:     20,
        moveSpeed:        1.2,   // m/s
        attackPower:      80,
        attackCooldownMs: 2000,
        maxHp:            500,
      },
      {
        spawnId:          'spawn-opa-002',
        zoneId:           'oceanpark-a',
        monsterType:      'goblin',
        lat:              20.9724,
        lng:              105.9375,
        respawnSeconds:   300,
        maxCount:         2,
        active:           true,
        aggroRangeM:      50,
        attackRangeM:     20,
        moveSpeed:        1.2,
        attackPower:      80,
        attackCooldownMs: 2000,
        maxHp:            500,
      },
      {
        spawnId:          'spawn-opa-003',
        zoneId:           'oceanpark-a',
        monsterType:      'orc',
        lat:              20.9708,
        lng:              105.9358,
        respawnSeconds:   600,   // 10분
        maxCount:         1,
        active:           true,
        aggroRangeM:      80,
        attackRangeM:     25,
        moveSpeed:        0.8,
        attackPower:      200,
        attackCooldownMs: 3000,
        maxHp:            2000,
      },

      // ── oceanpark-b ─────────────────────────────────────────────────────────
      {
        spawnId:          'spawn-opb-001',
        zoneId:           'oceanpark-b',
        monsterType:      'goblin',
        lat:              20.9650,
        lng:              105.9420,
        respawnSeconds:   300,
        maxCount:         3,
        active:           true,
        aggroRangeM:      50,
        attackRangeM:     20,
        moveSpeed:        1.2,
        attackPower:      80,
        attackCooldownMs: 2000,
        maxHp:            500,
      },
      {
        spawnId:          'spawn-opb-002',
        zoneId:           'oceanpark-b',
        monsterType:      'orc',
        lat:              20.9640,
        lng:              105.9435,
        respawnSeconds:   600,
        maxCount:         1,
        active:           true,
        aggroRangeM:      80,
        attackRangeM:     25,
        moveSpeed:        0.8,
        attackPower:      200,
        attackCooldownMs: 3000,
        maxHp:            2000,
      },

      // ── ecopark-a ───────────────────────────────────────────────────────────
      {
        spawnId:          'spawn-eco-001',
        zoneId:           'ecopark-a',
        monsterType:      'goblin',
        lat:              20.9430,
        lng:              105.9748,
        respawnSeconds:   300,
        maxCount:         4,
        active:           true,
        aggroRangeM:      50,
        attackRangeM:     20,
        moveSpeed:        1.2,
        attackPower:      80,
        attackCooldownMs: 2000,
        maxHp:            500,
      },
      {
        spawnId:          'spawn-eco-002',
        zoneId:           'ecopark-a',
        monsterType:      'orc',
        lat:              20.9418,
        lng:              105.9760,
        respawnSeconds:   600,
        maxCount:         2,
        active:           true,
        aggroRangeM:      80,
        attackRangeM:     25,
        moveSpeed:        0.8,
        attackPower:      200,
        attackCooldownMs: 3000,
        maxHp:            2000,
      },
    ],
  };
}
