"use strict";
/**
 * types/monster.ts
 * 몬스터 관련 타입 정의
 *
 * ⚠️ 핵심 원칙: SpawnPoint ≠ Instance
 * - MonsterSpawnPoint : 설정 데이터 (운영자가 수정, 변하지 않음)
 * - MonsterInstance   : 런타임 객체 (서버가 실시간 관리)
 *
 * 상태 머신:
 *   idle → chasing → attacking
 *   attacking → chasing (사거리 이탈)
 *   chasing → return (타겟 소실)
 *   return → idle (복귀 완료)
 *   any → dead → respawning → idle
 */
Object.defineProperty(exports, "__esModule", { value: true });
