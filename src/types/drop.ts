/**
 * types/drop.ts
 * 드랍 아이템 타입 정의
 *
 * - 몬스터 사망 시 서버가 생성
 * - 클라이언트에게 위치/아이템 정보 전달
 * - 실제 인벤토리 지급은 Firebase Functions(collectDrop) 담당
 */

export interface DropInstance {
  dropId: string;
  zoneId: string;
  /** 드랍을 발생시킨 몬스터 ID */
  monsterId: string;
  /** 드랍 위치 */
  lat: number;
  lng: number;
  /** treasure_items 컬렉션의 itemId */
  itemId: string;
  count: number;
  createdAt: number;
  /** 드랍 소멸 시각 (기본 5분) */
  expiresAt: number;
  /** 수령한 유저 userId (null = 미수령) */
  claimedBy: string | null;
}
