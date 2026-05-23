/**
 * routes/admin.ts
 * 관리자 REST API
 *
 * 모든 엔드포인트는 X-Admin-Key 헤더로 인증.
 * Railway 환경변수 ADMIN_SECRET 과 일치해야 한다.
 *
 * GET  /admin/spawns                     — 전체 스폰 목록 + 실시간 인스턴스 현황
 * POST /admin/spawns                     — 스폰 포인트 추가 (즉시 인스턴스 생성)
 * DELETE /admin/spawns/:spawnId          — 스폰 제거 + 모든 인스턴스 강제 사망 broadcast
 * POST /admin/monsters/:monsterId/kill   — 특정 인스턴스 강제 사망
 * GET  /admin/monster-types              — 전체 타입별 스탯 조회
 * PATCH /admin/monster-types/:type       — 타입 스탯(maxHp, attackPower) 수정 + 즉시 반영
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { getFirestore } from '../lib/firebaseAdmin.js';
import {
  getAllSpawnConfigs,
  getSpawnConfig,
  addSpawnConfig,
  removeSpawnConfig,
} from '../modules/admin/spawnConfigLoader.js';

import {
  getAllMonsters,
  getMonster,
  getMonstersBySpawn,
  removeMonstersBySpawn,
  setMonster,
} from '../modules/monster/monsterInstanceStore.js';

import { fillSpawnPoint } from '../modules/monster/monsterSpawnService.js';
import { markAsDead }     from '../modules/monster/monsterRespawnService.js';
import {
  broadcastMonsterDied,
  broadcastMonsterUpdate,
} from '../modules/gateway/clientSyncService.js';
import { findNearestZone } from '../modules/zone/zoneManager.js';
import { MonsterSpawnPoint } from '../types/monster.js';

const router = Router();

// ── 타입별 기본 스탯 ───────────────────────────────────────────────────────────
// 런타임에 PATCH /admin/monster-types/:type 으로 변경 가능 + Firestore 영속

const FS_TYPE_CONFIG = 'gs_monster_type_configs';

// 초기값 (서버 시작 시 Firestore 값으로 덮어씌워짐)
const MONSTER_TYPE_DEFAULTS: Record<string, Partial<MonsterSpawnPoint>> = {
  pirate:  { maxHp:  600, attackPower:  60, attackRangeM: 20, aggroRangeM:  40, moveSpeed: 1.5, attackCooldownMs: 1500, respawnSeconds: 90  },
  pirate2: { maxHp: 1000, attackPower: 110, attackRangeM: 20, aggroRangeM:  45, moveSpeed: 1.4, attackCooldownMs: 2000, respawnSeconds: 120 },
  pirate3: { maxHp: 1600, attackPower: 170, attackRangeM: 20, aggroRangeM:  50, moveSpeed: 1.3, attackCooldownMs: 2000, respawnSeconds: 180 },
  orc:     { maxHp: 1200, attackPower: 120, attackRangeM: 20, aggroRangeM:  50, moveSpeed: 1.2, attackCooldownMs: 2000, respawnSeconds: 150 },
  orc2:    { maxHp: 2000, attackPower: 190, attackRangeM: 20, aggroRangeM:  55, moveSpeed: 1.1, attackCooldownMs: 2200, respawnSeconds: 200 },
  orc3:    { maxHp: 3000, attackPower: 260, attackRangeM: 20, aggroRangeM:  60, moveSpeed: 1.0, attackCooldownMs: 2500, respawnSeconds: 240 },
  dragon:  { maxHp: 6000, attackPower: 320, attackRangeM: 20, aggroRangeM: 100, moveSpeed: 0.8, attackCooldownMs: 3000, respawnSeconds: 300 },
  goblin:  { maxHp:  400, attackPower:  40, attackRangeM: 20, aggroRangeM:  35, moveSpeed: 1.6, attackCooldownMs: 1200, respawnSeconds:  60 },
};

/** 서버 시작 시 Firestore에서 저장된 스탯 오버라이드를 복원 */
export async function loadMonsterTypeConfigs(): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const snap = await db.collection(FS_TYPE_CONFIG).get();
    for (const docSnap of snap.docs) {
      const type = docSnap.id;
      if (!MONSTER_TYPE_DEFAULTS[type]) continue;
      const data = docSnap.data();
      if (data.maxHp != null)      MONSTER_TYPE_DEFAULTS[type].maxHp      = Number(data.maxHp);
      if (data.attackPower != null) MONSTER_TYPE_DEFAULTS[type].attackPower = Number(data.attackPower);
    }
    logger.info('adminRoute', `[monster-types] Firestore에서 ${snap.size}개 타입 스탯 복원`);
  } catch (err: any) {
    logger.warn('adminRoute', `[monster-types] Firestore 복원 실패: ${err.message}`);
  }
}

/** body 우선, 없으면 타입별 기본값, 그래도 없으면 fallback */
function resolveSpawnStat<K extends keyof MonsterSpawnPoint>(
  body: Record<string, unknown>,
  typeDefaults: Partial<MonsterSpawnPoint>,
  key: K,
  fallback: MonsterSpawnPoint[K],
): MonsterSpawnPoint[K] {
  if (body[key] != null) return body[key] as MonsterSpawnPoint[K];
  if (typeDefaults[key] != null) return typeDefaults[key] as MonsterSpawnPoint[K];
  return fallback;
}

// ── 인증 미들웨어 ──────────────────────────────────────────────────────────────

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  if (!ENV.ADMIN_SECRET || key !== ENV.ADMIN_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

// ── GET /admin/spawns ─────────────────────────────────────────────────────────
// 전체 스폰 설정 + 각 스폰의 실시간 인스턴스 현황

router.get('/admin/spawns', adminAuth, (_req: Request, res: Response) => {
  const spawns   = getAllSpawnConfigs();
  const monsters = getAllMonsters();

  const result = spawns.map(s => {
    const instances = monsters.filter(m => m.spawnId === s.spawnId);
    const alive     = instances.filter(m => m.state !== 'dead' && m.state !== 'respawning').length;
    return {
      ...s,
      liveCount: alive,
      instances: instances.map(m => ({
        monsterId:  m.monsterId,
        state:      m.state,
        hp:         m.hp,
        maxHp:      m.maxHp,
        currentLat: m.currentLat,
        currentLng: m.currentLng,
        respawnAt:  m.respawnAt,
      })),
    };
  });

  res.json({ spawns: result, total: result.length });
});

// ── POST /admin/spawns ────────────────────────────────────────────────────────
// 스폰 포인트 추가. zoneId 미제공 시 좌표 기준으로 자동 배정.

router.post('/admin/spawns', adminAuth, (req: Request, res: Response) => {
  const body = req.body;

  if (!body.monsterType || body.lat == null || body.lng == null) {
    res.status(400).json({ error: 'missing required: monsterType, lat, lng' });
    return;
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);

  // zoneId 없으면 좌표 기준 가장 가까운 존 자동 배정
  const zoneId = body.zoneId || findNearestZone(lat, lng);
  if (!zoneId) {
    res.status(400).json({ error: 'no active zone found for these coordinates' });
    return;
  }

  const spawnId = body.spawnId || `spawn-admin-${uuidv4().slice(0, 8)}`;
  const td = MONSTER_TYPE_DEFAULTS[String(body.monsterType)] ?? {};

  const spawn: MonsterSpawnPoint = {
    spawnId,
    zoneId,
    monsterType:      String(body.monsterType),
    lat,
    lng,
    respawnSeconds:   resolveSpawnStat(body, td, 'respawnSeconds',   120),
    maxCount:         Number(body.maxCount) || 1,
    active:           body.active !== false,
    aggroRangeM:      resolveSpawnStat(body, td, 'aggroRangeM',      50),
    attackRangeM:     resolveSpawnStat(body, td, 'attackRangeM',     20),
    moveSpeed:        resolveSpawnStat(body, td, 'moveSpeed',        1.0),
    attackPower:      resolveSpawnStat(body, td, 'attackPower',      30),
    attackCooldownMs: resolveSpawnStat(body, td, 'attackCooldownMs', 2000),
    maxHp:            resolveSpawnStat(body, td, 'maxHp',            300),
  };

  addSpawnConfig(spawn);
  const created = fillSpawnPoint(spawn);

  // 신규 스폰 즉시 브로드캐스트 — 이미 접속한 플레이어가 바로 볼 수 있도록
  const newInstances = getMonstersBySpawn(spawnId);
  for (const m of newInstances) {
    broadcastMonsterUpdate(m.zoneId, m);
  }

  logger.info('adminRoute', `[admin] POST /admin/spawns → ${spawnId} (${spawn.monsterType} zone:${zoneId}) instances:${created}`);
  res.json({ spawnId, zoneId, instancesCreated: created, spawn });
});

// ── DELETE /admin/spawns/:spawnId ─────────────────────────────────────────────
// 스폰 제거 + 모든 인스턴스 강제 사망 broadcast (클라이언트 즉시 정리)

router.delete('/admin/spawns/:spawnId', adminAuth, (req: Request, res: Response) => {
  const { spawnId } = req.params;

  const spawn = getSpawnConfig(spawnId);
  if (!spawn) {
    res.status(404).json({ error: `spawn not found: ${spawnId}` });
    return;
  }

  // 1. 인스턴스를 먼저 죽음 broadcast (클라가 마커 제거하도록)
  const instances = getMonstersBySpawn(spawnId);
  for (const m of instances) {
    broadcastMonsterDied(m.zoneId, m.monsterId);
  }

  // 2. 메모리에서 인스턴스 제거
  const removed = removeMonstersBySpawn(spawnId);

  // 3. 스폰 설정 제거
  removeSpawnConfig(spawnId);

  logger.info('adminRoute', `[admin] DELETE /admin/spawns/${spawnId} → removed ${removed.length} instances`);
  res.json({ spawnId, removed: true, instancesRemoved: removed.length });
});

// ── POST /admin/monsters/:monsterId/kill ──────────────────────────────────────
// 특정 인스턴스 강제 사망 (스폰 설정은 유지 → respawn 후 부활)

router.post('/admin/monsters/:monsterId/kill', adminAuth, (req: Request, res: Response) => {
  const { monsterId } = req.params;
  const monster = getMonster(monsterId);

  if (!monster) {
    res.status(404).json({ error: `monster not found: ${monsterId}` });
    return;
  }

  if (monster.state === 'dead' || monster.state === 'respawning') {
    res.json({ monsterId, killed: false, reason: 'already dead' });
    return;
  }

  // 스폰 설정에서 respawnSeconds 참조
  const spawnCfg    = getSpawnConfig(monster.spawnId);
  const respawnSecs = spawnCfg?.respawnSeconds ?? 120;

  const dead = markAsDead(monster, respawnSecs);
  broadcastMonsterDied(dead.zoneId, dead.monsterId);

  logger.info('adminRoute', `[admin] kill ${monsterId} (${monster.type}), respawnIn=${respawnSecs}s`);
  res.json({ monsterId, killed: true, respawnSeconds: respawnSecs });
});

// ── GET /admin/monster-types ──────────────────────────────────────────────────
// 전체 타입별 현재 스탯 반환

router.get('/admin/monster-types', adminAuth, (_req: Request, res: Response) => {
  const result = Object.entries(MONSTER_TYPE_DEFAULTS).map(([type, stats]) => ({
    type,
    maxHp:            stats.maxHp            ?? 0,
    attackPower:      stats.attackPower      ?? 0,
    attackCooldownMs: stats.attackCooldownMs ?? 2000,
    aggroRangeM:      stats.aggroRangeM      ?? 50,
    moveSpeed:        stats.moveSpeed        ?? 1.0,
    respawnSeconds:   stats.respawnSeconds   ?? 120,
  }));
  res.json({ types: result });
});

// ── PATCH /admin/monster-types/:type ─────────────────────────────────────────
// maxHp / attackPower 변경 → 메모리 반영 + 살아있는 인스턴스 즉시 업데이트 + Firestore 저장

router.patch('/admin/monster-types/:type', adminAuth, async (req: Request, res: Response) => {
  const { type } = req.params;
  if (!MONSTER_TYPE_DEFAULTS[type]) {
    res.status(404).json({ error: `unknown monster type: ${type}` });
    return;
  }

  const { maxHp, attackPower } = req.body as { maxHp?: unknown; attackPower?: unknown };
  const updates: Partial<MonsterSpawnPoint> = {};

  if (maxHp != null) {
    const v = Number(maxHp);
    if (!isFinite(v) || v < 1) { res.status(400).json({ error: 'maxHp must be a positive number' }); return; }
    updates.maxHp = Math.round(v);
  }
  if (attackPower != null) {
    const v = Number(attackPower);
    if (!isFinite(v) || v < 0) { res.status(400).json({ error: 'attackPower must be >= 0' }); return; }
    updates.attackPower = Math.round(v);
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'maxHp 또는 attackPower 중 하나 이상 필요' });
    return;
  }

  // 1. 메모리 기본값 갱신
  Object.assign(MONSTER_TYPE_DEFAULTS[type], updates);

  // 2. 살아있는 인스턴스 즉시 반영 + broadcast
  const monsters = getAllMonsters().filter(m => m.type === type);
  let updated = 0;
  for (const m of monsters) {
    const changed = { ...m };
    if (updates.maxHp != null) {
      changed.maxHp = updates.maxHp;
      if (changed.hp > updates.maxHp) changed.hp = updates.maxHp; // HP 초과 시 클램프
    }
    if (updates.attackPower != null) changed.attackPower = updates.attackPower;
    setMonster(changed);
    broadcastMonsterUpdate(changed.zoneId, changed);
    updated++;
  }

  // 3. Firestore 영속
  const db = getFirestore();
  if (db) {
    db.collection(FS_TYPE_CONFIG).doc(type).set(
      { ...updates, updatedAt: new Date().toISOString() },
      { merge: true },
    ).catch((err: any) => logger.warn('adminRoute', `Firestore monster-type save failed: ${err.message}`));
  }

  logger.info('adminRoute', `[admin] PATCH /admin/monster-types/${type} → ${JSON.stringify(updates)} (${updated} instances updated)`);
  res.json({ type, updated: updates, instancesUpdated: updated });
});

export default router;
