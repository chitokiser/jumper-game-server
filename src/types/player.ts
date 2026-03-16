/**
 * types/player.ts
 * 플레이어 실시간 상태 타입 정의
 *
 * - HP/MP는 전투 서버 기준값 (Firebase와 분리)
 * - 위치는 클라이언트가 보고한 실시간 값 (accuracy로 신뢰도 보정)
 * - 인벤토리·장기 저장 데이터는 Firebase Functions 담당
 */

export type PlayerStateEnum = 'alive' | 'dead' | 'revive_wait';

export interface PlayerState {
  /** Firebase UID */
  userId: string;
  /** 현재 속한 존 ID */
  zoneId: string;
  /** 현재 위도 */
  lat: number;
  /** 현재 경도 */
  lng: number;
  /** GPS 정확도 (미터). 클수록 부정확 */
  accuracy: number;

  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;

  state: PlayerStateEnum;

  /** 마지막 위치 수신 시각 (Unix ms) */
  lastSeenAt: number;
  /** 마지막 실제 이동 시각 */
  lastMoveAt: number;
  /** 마지막으로 몬스터에게 피격된 시각 */
  lastAttackedAt: number;
}
