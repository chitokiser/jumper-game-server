"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFirebaseAdmin = initFirebaseAdmin;
exports.getFirestore = getFirestore;
const admin = __importStar(require("firebase-admin"));
const logger_js_1 = require("./logger.js");
let _db = null;
function initFirebaseAdmin() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
        logger_js_1.logger.warn('firebaseAdmin', 'Firebase 환경변수 미설정 — 스폰 영구저장 비활성화');
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
    logger_js_1.logger.info('firebaseAdmin', `Firebase Admin 초기화 완료 (project: ${projectId})`);
}
function getFirestore() {
    return _db;
}
