"use strict";
/**
 * modules/gateway/eventNames.ts
 * 클라이언트 ↔ 서버 간 Socket.io 이벤트 이름 상수
 *
 * 클라이언트 → 서버 (C2S)
 * 서버 → 클라이언트 (S2C)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2C = exports.C2S = void 0;
/** 클라이언트 → 서버 */
exports.C2S = {
    /** 존 참가 요청: { userId, zoneId, lat, lng, accuracy, level } */
    PLAYER_JOIN: 'player:join',
    /** 위치 업데이트: { lat, lng, accuracy } */
    PLAYER_LOCATION: 'player:location',
    /** 존 퇴장 */
    PLAYER_LEAVE: 'player:leave',
    /** 플레이어 → 몬스터 공격: { monsterId } */
    PLAYER_ATTACK: 'player:attack',
    /** 스킬 사용: { skillId, monsterId? } */
    PLAYER_SKILL: 'player:skill',
    /** 부활 요청 (사망 후 클라이언트에서 호출) */
    PLAYER_REVIVE: 'player:revive',
};
/** 서버 → 클라이언트 */
exports.S2C = {
    /** 존 전체 스냅샷 (접속 직후 or 주기적 동기화) */
    ZONE_SNAPSHOT: 'zone:snapshot',
    /** 몬스터 상태 변경 (단건) */
    MONSTER_UPDATE: 'monster:update',
    /** 몬스터 사망 */
    MONSTER_DIED: 'monster:died',
    /** 몬스터 리스폰 */
    MONSTER_RESPAWNED: 'monster:respawned',
    /** 플레이어 피격 */
    PLAYER_HIT: 'player:hit',
    /** 플레이어 사망 */
    PLAYER_DIED: 'player:died',
    /** 드랍 생성 */
    DROP_SPAWNED: 'drop:spawned',
    /** 플레이어 부활 완료 */
    PLAYER_REVIVED: 'player:revived',
    /** 에러 알림 */
    ERROR: 'error',
};
