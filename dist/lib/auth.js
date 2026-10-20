"use strict";
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
exports.verifyIdToken = verifyIdToken;
exports.isAdminUser = isAdminUser;
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_js_1 = require("./firebaseAdmin.js");
const logger_js_1 = require("./logger.js");
const OPERATOR_EMAILS = ['daguri75@gmail.com'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'CEO', 'ADMIN', 'admin'];
/** 토큰 검증 — 실패 시 null */
async function verifyIdToken(token) {
    if (typeof token !== 'string' || token.length < 20)
        return null;
    try {
        return await admin.auth().verifyIdToken(token);
    }
    catch (e) {
        logger_js_1.logger.warn('auth', `token rejected: ${e.message}`);
        return null;
    }
}
/** 관리자 판정 (결과 5분 캐시) */
const _adminCache = new Map();
const ADMIN_CACHE_MS = 5 * 60000;
async function isAdminUser(decoded) {
    if (decoded.email && decoded.email_verified !== false && OPERATOR_EMAILS.includes(decoded.email))
        return true;
    const hit = _adminCache.get(decoded.uid);
    if (hit && Date.now() - hit.at < ADMIN_CACHE_MS)
        return hit.ok;
    const db = (0, firebaseAdmin_js_1.getFirestore)();
    if (!db)
        return false;
    let ok = false;
    try {
        const [adm, usr] = await Promise.all([
            db.collection('admins').doc(decoded.uid).get(),
            db.collection('users').doc(decoded.uid).get(),
        ]);
        const u = usr.data() || {};
        ok = adm.exists || u.isAdmin === true || ADMIN_ROLES.includes(u.role);
    }
    catch (e) {
        logger_js_1.logger.warn('auth', `admin check failed: ${e.message}`);
    }
    _adminCache.set(decoded.uid, { ok, at: Date.now() });
    return ok;
}
