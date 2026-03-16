"use strict";
/**
 * types/player.ts
 * 플레이어 실시간 상태 타입 정의
 *
 * - HP/MP는 전투 서버 기준값 (Firebase와 분리)
 * - 위치는 클라이언트가 보고한 실시간 값 (accuracy로 신뢰도 보정)
 * - 인벤토리·장기 저장 데이터는 Firebase Functions 담당
 */
Object.defineProperty(exports, "__esModule", { value: true });
