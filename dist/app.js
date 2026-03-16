"use strict";
/**
 * src/app.ts
 * Express 앱 설정
 *
 * ⚠️ Git 저장소: github.com/chitokiser/jumper-game-server
 *    Railway 배포 전용 — 메인 프로젝트(jumper_v10)와 완전 분리
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_js_1 = require("./config/env.js");
const health_js_1 = __importDefault(require("./routes/health.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: env_js_1.ENV.ALLOWED_ORIGINS }));
app.use(express_1.default.json());
app.use('/', health_js_1.default);
app.use('/', admin_js_1.default);
exports.default = app;
