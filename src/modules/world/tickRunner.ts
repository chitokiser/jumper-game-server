/**
 * modules/world/tickRunner.ts
 * 고정 주기 tick 실행기
 *
 * - setInterval 기반 고정 주기 보장
 * - 이전 tick이 아직 실행 중이면 건너뜀 (중복 방지)
 */

import { logger } from '../../lib/logger.js';

export type TickCallback = (deltaMs: number) => void | Promise<void>;

export class TickRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickAt = 0;
  private running = false;
  private busy = false;

  constructor(
    private readonly name: string,
    private readonly tickMs: number,
    private readonly cb: TickCallback,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickAt = Date.now();

    this.timer = setInterval(async () => {
      if (this.busy) return; // 이전 tick 실행 중
      this.busy = true;
      const now = Date.now();
      const delta = now - this.lastTickAt;
      this.lastTickAt = now;

      try {
        await this.cb(delta);
      } catch (err) {
        logger.error('tickRunner', `[${this.name}] tick error`, err);
      } finally {
        this.busy = false;
      }
    }, this.tickMs);

    logger.info('tickRunner', `[${this.name}] started (${this.tickMs}ms)`);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.running = false;
    logger.info('tickRunner', `[${this.name}] stopped`);
  }
}
