/**
 * modules/monster/potionShopSpawnLoader.ts
 * 약물상점(potion/shop_potion) 기반 몬스터 스폰 자동 생성
 *
 * 서버 시작 시 Firestore game_shops에서 모든 약물상점을 읽어
 * 각 상점 중심 ~600-900m 반경에 5종 × 50마리(5스폰 × maxCount:10) 자동 배치
 *
 * - 스폰 ID 형식: ps-{shopId}-{monsterType}-{1~5}
 * - 존 ID 형식: potionshop-{shopId}
 * - Firestore 저장 없음 — 재시작 시 game_shops에서 재생성
 */

import { getFirestore } from '../../lib/firebaseAdmin.js';
import { MonsterSpawnPoint } from '../../types/monster.js';
import { ZoneConfig } from '../../types/zone.js';
import { registerZone } from '../zone/zoneRegistry.js';
import { registerSpawnConfig } from '../admin/spawnConfigLoader.js';
import { logger } from '../../lib/logger.js';

// ── 스폰 오프셋 테이블 (중심 기준 위경도 델타) ────────────────────────────────
// 1° lat ≈ 111,320m  /  1° lng ≈ 103,940m (하노이 위도 기준)

/** ~600m 반경 5점 (cabi, monster_eyes) */
const OFFSETS_600: { dlat: number; dlng: number }[] = [
  { dlat:  0.0040, dlng:  0.0040 }, // NE ~608m
  { dlat: -0.0040, dlng:  0.0040 }, // SE ~608m
  { dlat:  0.0040, dlng: -0.0040 }, // NW ~608m
  { dlat: -0.0040, dlng: -0.0040 }, // SW ~608m
  { dlat:  0.0000, dlng:  0.0050 }, // E  ~519m
];

/** ~737m 반경 5점 (orc) */
const OFFSETS_737: { dlat: number; dlng: number }[] = [
  { dlat:  0.0060, dlng:  0.0030 }, // NNE
  { dlat: -0.0060, dlng: -0.0030 }, // SSW
  { dlat:  0.0060, dlng: -0.0030 }, // NNW
  { dlat: -0.0060, dlng:  0.0030 }, // SSE
  { dlat:  0.0000, dlng:  0.0070 }, // E
];

/** ~800m 반경 5점 (orc2) */
const OFFSETS_800: { dlat: number; dlng: number }[] = [
  { dlat:  0.0070, dlng:  0.0020 }, // N~806m
  { dlat: -0.0070, dlng: -0.0020 }, // S~806m
  { dlat:  0.0020, dlng:  0.0070 }, // NE~760m
  { dlat: -0.0020, dlng: -0.0070 }, // SW~760m
  { dlat:  0.0050, dlng: -0.0060 }, // NW~835m
];

/** ~900m 반경 5점 (orc3) */
const OFFSETS_900: { dlat: number; dlng: number }[] = [
  { dlat:  0.0080, dlng:  0.0020 }, // N~914m
  { dlat: -0.0080, dlng: -0.0020 }, // S~914m
  { dlat:  0.0050, dlng:  0.0070 }, // NE~916m
  { dlat: -0.0050, dlng: -0.0070 }, // SW~916m
  { dlat:  0.0000, dlng: -0.0085 }, // W~883m
];

interface SpawnTemplate {
  type: string;
  maxHp: number;
  attackPower: number;
  aggroRangeM: number;
  attackRangeM: number;
  moveSpeed: number;
  attackCooldownMs: number;
  respawnSeconds: number;
  offsets: { dlat: number; dlng: number }[];
}

const TEMPLATES: SpawnTemplate[] = [
  {
    type: 'cabi', maxHp: 300, attackPower: 30,
    aggroRangeM: 25, attackRangeM: 10, moveSpeed: 1.5,
    attackCooldownMs: 1500, respawnSeconds: 120,
    offsets: OFFSETS_600,
  },
  {
    type: 'monster_eyes', maxHp: 800, attackPower: 80,
    aggroRangeM: 30, attackRangeM: 15, moveSpeed: 1.0,
    attackCooldownMs: 2000, respawnSeconds: 180,
    offsets: OFFSETS_600,
  },
  {
    type: 'orc', maxHp: 2000, attackPower: 200,
    aggroRangeM: 80, attackRangeM: 20, moveSpeed: 0.8,
    attackCooldownMs: 3000, respawnSeconds: 300,
    offsets: OFFSETS_737,
  },
  {
    type: 'orc2', maxHp: 3500, attackPower: 320,
    aggroRangeM: 100, attackRangeM: 25, moveSpeed: 0.7,
    attackCooldownMs: 2500, respawnSeconds: 420,
    offsets: OFFSETS_800,
  },
  {
    type: 'orc3', maxHp: 6000, attackPower: 480,
    aggroRangeM: 120, attackRangeM: 30, moveSpeed: 0.6,
    attackCooldownMs: 2000, respawnSeconds: 600,
    offsets: OFFSETS_900,
  },
];

/**
 * Firestore game_shops에서 모든 약물상점을 읽어
 * 각 상점마다 존 + 25 스폰포인트를 등록한다.
 *
 * initAllSpawns() 호출 전에 실행해야 함.
 * Firestore 미설정 시 조용히 스킵.
 */
export async function loadPotionShopSpawns(): Promise<void> {
  const db = getFirestore();
  if (!db) {
    logger.warn('potionShopSpawns', 'Firestore unavailable — skipping potion shop spawn generation');
    return;
  }

  let snap;
  try {
    snap = await db.collection('game_shops')
      .where('type', 'in', ['potion', 'shop_potion'])
      .get();
  } catch (err: any) {
    logger.warn('potionShopSpawns', `Firestore query failed: ${err.message}`);
    return;
  }

  if (snap.empty) {
    logger.info('potionShopSpawns', 'No potion shops found');
    return;
  }

  let totalSpawns = 0;

  for (const doc of snap.docs) {
    const shop = doc.data();
    const shopId = doc.id;
    const lat = shop.lat as number;
    const lng = shop.lng as number;

    if (lat == null || lng == null) {
      logger.warn('potionShopSpawns', `shop ${shopId} missing lat/lng — skipped`);
      continue;
    }

    // 존 등록 — 상점 중심 1000m 반경
    const zoneId = `potionshop-${shopId}`;
    const zone: ZoneConfig = {
      zoneId,
      name:       `Potion Shop Zone (${shop.name ?? shopId})`,
      centerLat:  lat,
      centerLng:  lng,
      radiusM:    1000,
      active:     true,
      tickRateMs: 1000,
    };
    registerZone(zone);

    // 25 스폰포인트 등록 (5종 × 5위치)
    for (const tmpl of TEMPLATES) {
      for (let i = 0; i < tmpl.offsets.length; i++) {
        const o = tmpl.offsets[i];
        const spawn: MonsterSpawnPoint = {
          spawnId:          `ps-${shopId}-${tmpl.type}-${i + 1}`,
          zoneId,
          monsterType:      tmpl.type,
          lat:              lat + o.dlat,
          lng:              lng + o.dlng,
          respawnSeconds:   tmpl.respawnSeconds,
          maxCount:         10,
          active:           true,
          aggroRangeM:      tmpl.aggroRangeM,
          attackRangeM:     tmpl.attackRangeM,
          moveSpeed:        tmpl.moveSpeed,
          attackPower:      tmpl.attackPower,
          attackCooldownMs: tmpl.attackCooldownMs,
          maxHp:            tmpl.maxHp,
        };
        registerSpawnConfig(spawn);
        totalSpawns++;
      }
    }

    logger.info('potionShopSpawns',
      `shop ${shopId} → zone ${zoneId} | 25 spawns | center (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    );
  }

  logger.info('potionShopSpawns',
    `${snap.size} potion shops → ${totalSpawns} spawn points (${snap.size * 250} monsters)`
  );
}
