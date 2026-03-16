"use strict";
/**
 * types/zone.ts
 * 존(Zone) 관련 타입 정의
 *
 * Zone = 유저와 몬스터가 존재하는 관리 단위
 * - 너무 크게 잡으면 계산 비용이 커지므로 반경 500~2000m 수준 권장
 * - 플레이어가 없는 존은 tick을 경량화하여 서버 자원 절약
 */
Object.defineProperty(exports, "__esModule", { value: true });
