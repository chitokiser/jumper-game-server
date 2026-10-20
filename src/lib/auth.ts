/**
 * lib/auth.ts
 * Firebase 로그인 토큰 검증 + 관리자 판정
 *
 * 관리자 기준은 jumper_v10/firestore.rules 의 isAdmin() 과 같다.
 *   - 운영자 이메일
 *   - admins/{uid} 문서 존재
 *   - users/{uid}.isAdmin == true 또는 role 이 관리자 계열
 * Firestore 자격증명이 없으면 운영자 이메일만 관리자로 인정한다.
 */

import * as admin from 'firebase-admin';
import { getFirestore } from './firebaseAdmin.js';
import { logger } from './logger.js';

const OPERATOR_EMAILS = ['daguri75@gmail.com'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'CEO', 'ADMIN', 'admin'];

/** 토큰 검증 — 실패 시 null */
export async function verifyIdToken(token: unknown): Promise<admin.auth.DecodedIdToken | null> {
  if (typeof token !== 'string' || token.length < 20) return null;
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (e) {
    logger.warn('auth', `token rejected: ${(e as Error).message}`);
    return null;
  }
}

/** 관리자 판정 (결과 5분 캐시) */
const _adminCache = new Map<string, { ok: boolean; at: number }>();
const ADMIN_CACHE_MS = 5 * 60_000;

export async function isAdminUser(decoded: admin.auth.DecodedIdToken): Promise<boolean> {
  if (decoded.email && decoded.email_verified !== false && OPERATOR_EMAILS.includes(decoded.email)) return true;
  const hit = _adminCache.get(decoded.uid);
  if (hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.ok;

  const db = getFirestore();
  if (!db) return false;
  let ok = false;
  try {
    const [adm, usr] = await Promise.all([
      db.collection('admins').doc(decoded.uid).get(),
      db.collection('users').doc(decoded.uid).get(),
    ]);
    const u = usr.data() || {};
    ok = adm.exists || u.isAdmin === true || ADMIN_ROLES.includes(u.role);
  } catch (e) {
    logger.warn('auth', `admin check failed: ${(e as Error).message}`);
  }
  _adminCache.set(decoded.uid, { ok, at: Date.now() });
  return ok;
}
