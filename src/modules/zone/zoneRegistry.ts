/**
 * modules/zone/zoneRegistry.ts
 * 존 설정 레지스트리 — ZoneConfig 읽기 전용 저장소
 */

import { ZoneConfig } from '../../types/zone.js';
import { logger } from '../../lib/logger.js';

const registry = new Map<string, ZoneConfig>();

export function registerZone(config: ZoneConfig): void {
  registry.set(config.zoneId, config);
  logger.info('zoneRegistry', `registered zone: ${config.zoneId} (${config.name})`);
}

export function getZoneConfig(zoneId: string): ZoneConfig | undefined {
  return registry.get(zoneId);
}

export function getAllZoneConfigs(): ZoneConfig[] {
  return [...registry.values()];
}

export function getActiveZoneConfigs(): ZoneConfig[] {
  return [...registry.values()].filter(z => z.active);
}

export function unregisterZone(zoneId: string): void {
  registry.delete(zoneId);
}
