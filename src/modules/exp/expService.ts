/**
 * modules/exp/expService.ts
 * 게임서버 EXP/레벨업 시스템
 *
 * - EXP 출처: 몬스터 maxHp (서버 기준, 클라이언트 신뢰 불가)
 * - 레벨업 공식: (currentLevel + 1)² × 100,000
 * - 온체인 EXP와 완전 독립: Firestore battle_players.{gsExp, gsLevel}
 * - 레벨 상한: 99
 */

import { getPlayer, setPlayer, getLangBySocket } from '../player/playerStateStore.js';
import { getSocketId } from '../gateway/socketGateway.js';
import { sendNotify, sendPlayerExpUpdate, sendPlayerLevelUp } from '../gateway/clientSyncService.js';
import { t } from '../../lib/i18n.js';
import { getFirestore } from '../../lib/firebaseAdmin.js';
import { logger } from '../../lib/logger.js';

const LEVEL_CAP = 99;
const MAX_EXP_PER_KILL = 100_000;
const MAX_TOTAL_EXP = LEVEL_CAP * LEVEL_CAP * MAX_EXP_PER_KILL;

export function calcNextLevelExp(currentLevel: number): number {
  return Math.pow(currentLevel + 1, 2) * 100_000;
}

/** 몬스터 처치 시 EXP 지급 (동기, fire-and-forget Firestore) */
export function awardExpOnKill(userId: string, monsterMaxHp: number): void {
  const player = getPlayer(userId);
  if (!player || player.state !== 'alive') return;

  const expGain = Math.min(monsterMaxHp, MAX_EXP_PER_KILL);
  const newExp  = Math.min(MAX_TOTAL_EXP, player.exp + expGain);
  let currentLevel = player.level;
  const levelUpList: number[] = [];

  while (currentLevel < LEVEL_CAP) {
    const needed = calcNextLevelExp(currentLevel);
    if (newExp < needed) break;
    currentLevel++;
    levelUpList.push(currentLevel);
  }

  setPlayer({ ...player, exp: newExp, level: currentLevel });

  const socketId = getSocketId(userId);
  if (socketId) {
    const lang = getLangBySocket(socketId);
    sendNotify(socketId, t(lang, 'exp_gained', expGain));
    for (const lv of levelUpList) {
      sendPlayerLevelUp(socketId, lv, newExp, calcNextLevelExp(lv));
      sendNotify(socketId, t(lang, 'level_up', lv));
    }
    sendPlayerExpUpdate(socketId, currentLevel, newExp, calcNextLevelExp(currentLevel));
  }

  persistExpToFirestore(userId, currentLevel, newExp).catch(e =>
    logger.warn('expService', `Firestore EXP 저장 실패: ${e}`)
  );
}

async function persistExpToFirestore(userId: string, level: number, exp: number): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  await db.collection('battle_players').doc(userId).set(
    { gsExp: exp, gsLevel: level, updatedAt: new Date() },
    { merge: true }
  );
}

/** 접속 시 Firestore에서 EXP/레벨 복원 */
export async function loadExpFromFirestore(userId: string): Promise<{ exp: number; level: number }> {
  const db = getFirestore();
  if (!db) return { exp: 0, level: 1 };
  try {
    const snap = await db.collection('battle_players').doc(userId).get();
    if (!snap.exists) return { exp: 0, level: 1 };
    const d = snap.data()!;
    return {
      exp:   typeof d.gsExp   === 'number' ? d.gsExp   : 0,
      level: typeof d.gsLevel === 'number' ? d.gsLevel : 1,
    };
  } catch {
    return { exp: 0, level: 1 };
  }
}
