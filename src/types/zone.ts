/**
 * types/zone.ts
 * 존(Zone) 관련 타입 정의
 *
 * Zone = 유저와 몬스터가 존재하는 관리 단위
 * - 너무 크게 잡으면 계산 비용이 커지므로 반경 500~2000m 수준 권장
 * - 플레이어가 없는 존은 tick을 경량화하여 서버 자원 절약
 */

export interface ZoneConfig {
  /** 존 고유 ID (예: "oceanpark-a") */
  zoneId: string;
  /** 표시 이름 */
  name: string;
  /** 존 중심 위도 */
  centerLat: number;
  /** 존 중심 경도 */
  centerLng: number;
  /** 존 반경 (미터) */
  radiusM: number;
  /** 활성 여부 */
  active: boolean;
  /** tick 주기 (ms). 기본 1000ms */
  tickRateMs: number;
}
