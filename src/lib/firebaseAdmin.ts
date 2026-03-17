/**
 * lib/firebaseAdmin.ts
 * Firebase Admin SDK 초기화 (게임서버용)
 *
 * Railway 환경변수:
 *   FIREBASE_PROJECT_ID  — Firebase 프로젝트 ID
 *   FIREBASE_CLIENT_EMAIL — 서비스 계정 이메일
 *   FIREBASE_PRIVATE_KEY  — 서비스 계정 비공개 키 (\n 포함 raw string)
 *
 * 위 변수가 없으면 초기화를 건너뛰고 Firestore 기능이 비활성화됩니다.
 */

import * as admin from 'firebase-admin';
import { logger } from './logger.js';

let _db: admin.firestore.Firestore | null = null;

export function initFirebaseAdmin(): void {
  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('firebaseAdmin', 'Firebase 환경변수 미설정 — 스폰 영구저장 비활성화');
    return;
  }

  if (admin.apps.length > 0) {
    _db = admin.firestore();
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  _db = admin.firestore();
  logger.info('firebaseAdmin', `Firebase Admin 초기화 완료 (project: ${projectId})`);
}

export function getFirestore(): admin.firestore.Firestore | null {
  return _db;
}
