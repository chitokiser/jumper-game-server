"use strict";
/**
 * config/env.ts
 * 환경변수 중앙 관리
 * Railway는 PORT를 자동으로 주입한다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    PORT: Number(process.env.PORT) || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    /** CORS 허용 오리진 (콤마 구분, 미설정 시 전체 허용) */
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
        : '*',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    /** 관리자 REST API 인증 키 (X-Admin-Key 헤더) */
    ADMIN_SECRET: process.env.ADMIN_SECRET || 'jumper-admin-dev',
};
