"use strict";
/**
 * lib/i18n.ts
 * In-game user notification strings — ko / en / vi
 *
 * Usage:
 *   import { t, parseLang } from '../../lib/i18n.js';
 *   const msg = t(player.lang, 'player_died');
 *   const msg = t(player.lang, 'drop_gold', 150);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANG_DEFAULT = void 0;
exports.parseLang = parseLang;
exports.t = t;
exports.LANG_DEFAULT = 'en';
const VALID = new Set(['ko', 'en', 'vi']);
function parseLang(raw) {
    return typeof raw === 'string' && VALID.has(raw) ? raw : exports.LANG_DEFAULT;
}
const MESSAGES = {
    ko: {
        zone_joined: (z) => `${z} 존에 입장했습니다.`,
        player_died: '사망했습니다. 부활 대기 중...',
        player_revived: (hp) => `부활! HP ${hp}`,
        drop_gold: (g) => `골드 +${g} 획득!`,
        err_dead: '사망 상태에서는 행동할 수 없습니다.',
        err_cooldown: '쿨타임 중입니다.',
        err_out_of_range: '공격 사거리 밖입니다.',
        err_monster_dead: '이미 처치된 몬스터입니다.',
        monster_frozen: (n) => `❄️ 몬스터 ${n}마리 동결!`,
    },
    en: {
        zone_joined: (z) => `Joined zone: ${z}`,
        player_died: 'You died. Waiting to revive...',
        player_revived: (hp) => `Revived! HP ${hp}`,
        drop_gold: (g) => `Gold +${g}!`,
        err_dead: 'Cannot act while dead.',
        err_cooldown: 'Attack on cooldown.',
        err_out_of_range: 'Out of attack range.',
        err_monster_dead: 'Monster already defeated.',
        monster_frozen: (n) => `❄️ ${n} monster(s) frozen!`,
    },
    vi: {
        zone_joined: (z) => `Đã vào khu vực: ${z}`,
        player_died: 'Bạn đã chết. Đang chờ hồi sinh...',
        player_revived: (hp) => `Hồi sinh! HP ${hp}`,
        drop_gold: (g) => `Vàng +${g}!`,
        err_dead: 'Không thể hành động khi đã chết.',
        err_cooldown: 'Chiêu thức đang hồi.',
        err_out_of_range: 'Ngoài tầm tấn công.',
        err_monster_dead: 'Quái vật đã bị tiêu diệt rồi.',
        monster_frozen: (n) => `❄️ Đóng băng ${n} quái vật!`,
    },
};
function t(lang, key, ...args) {
    const dict = MESSAGES[lang] ?? MESSAGES[exports.LANG_DEFAULT];
    const val = dict[key] ?? MESSAGES[exports.LANG_DEFAULT][key];
    if (!val)
        return key;
    return typeof val === 'function' ? val(...args) : val;
}
