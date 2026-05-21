/**
 * lib/i18n.ts
 * In-game user notification strings — ko / en / vi
 *
 * Usage:
 *   import { t, parseLang } from '../../lib/i18n.js';
 *   const msg = t(player.lang, 'player_died');
 *   const msg = t(player.lang, 'drop_gold', 150);
 */

export type Lang = 'ko' | 'en' | 'vi';
export const LANG_DEFAULT: Lang = 'en';
const VALID = new Set<string>(['ko', 'en', 'vi']);

export function parseLang(raw: unknown): Lang {
  return typeof raw === 'string' && VALID.has(raw) ? (raw as Lang) : LANG_DEFAULT;
}

type Fn = (...a: unknown[]) => string;
type Msg = string | Fn;

const MESSAGES: Record<Lang, Record<string, Msg>> = {
  ko: {
    zone_joined:      (z: unknown) => `${z} 존에 입장했습니다.`,
    player_died:      '사망했습니다. 부활 대기 중...',
    player_revived:   (hp: unknown) => `부활! HP ${hp}`,
    drop_gold:        (g: unknown) => `골드 +${g} 획득!`,
    err_dead:         '사망 상태에서는 행동할 수 없습니다.',
    err_cooldown:     '쿨타임 중입니다.',
    err_out_of_range: '공격 사거리 밖입니다.',
    err_monster_dead: '이미 처치된 몬스터입니다.',
    monster_frozen:   (n: unknown) => `❄️ 몬스터 ${n}마리 동결!`,
  },
  en: {
    zone_joined:      (z: unknown) => `Joined zone: ${z}`,
    player_died:      'You died. Waiting to revive...',
    player_revived:   (hp: unknown) => `Revived! HP ${hp}`,
    drop_gold:        (g: unknown) => `Gold +${g}!`,
    err_dead:         'Cannot act while dead.',
    err_cooldown:     'Attack on cooldown.',
    err_out_of_range: 'Out of attack range.',
    err_monster_dead: 'Monster already defeated.',
    monster_frozen:   (n: unknown) => `❄️ ${n} monster(s) frozen!`,
  },
  vi: {
    zone_joined:      (z: unknown) => `Đã vào khu vực: ${z}`,
    player_died:      'Bạn đã chết. Đang chờ hồi sinh...',
    player_revived:   (hp: unknown) => `Hồi sinh! HP ${hp}`,
    drop_gold:        (g: unknown) => `Vàng +${g}!`,
    err_dead:         'Không thể hành động khi đã chết.',
    err_cooldown:     'Chiêu thức đang hồi.',
    err_out_of_range: 'Ngoài tầm tấn công.',
    err_monster_dead: 'Quái vật đã bị tiêu diệt rồi.',
    monster_frozen:   (n: unknown) => `❄️ Đóng băng ${n} quái vật!`,
  },
};

export function t(lang: Lang, key: string, ...args: unknown[]): string {
  const dict = MESSAGES[lang] ?? MESSAGES[LANG_DEFAULT];
  const val  = dict[key] ?? MESSAGES[LANG_DEFAULT][key];
  if (!val) return key;
  return typeof val === 'function' ? val(...args) : val;
}
