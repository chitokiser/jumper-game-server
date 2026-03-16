"use strict";
/**
 * modules/world/tickRunner.ts
 * 고정 주기 tick 실행기
 *
 * - setInterval 기반 고정 주기 보장
 * - 이전 tick이 아직 실행 중이면 건너뜀 (중복 방지)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickRunner = void 0;
const logger_js_1 = require("../../lib/logger.js");
class TickRunner {
    constructor(name, tickMs, cb) {
        this.name = name;
        this.tickMs = tickMs;
        this.cb = cb;
        this.timer = null;
        this.lastTickAt = 0;
        this.running = false;
        this.busy = false;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.lastTickAt = Date.now();
        this.timer = setInterval(async () => {
            if (this.busy)
                return; // 이전 tick 실행 중
            this.busy = true;
            const now = Date.now();
            const delta = now - this.lastTickAt;
            this.lastTickAt = now;
            try {
                await this.cb(delta);
            }
            catch (err) {
                logger_js_1.logger.error('tickRunner', `[${this.name}] tick error`, err);
            }
            finally {
                this.busy = false;
            }
        }, this.tickMs);
        logger_js_1.logger.info('tickRunner', `[${this.name}] started (${this.tickMs}ms)`);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.running = false;
        logger_js_1.logger.info('tickRunner', `[${this.name}] stopped`);
    }
}
exports.TickRunner = TickRunner;
