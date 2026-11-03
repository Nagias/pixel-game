// F18 đợt C: biểu tượng giao diện (đồng xu, vũ khí, skill, nâng cấp, nút thanh dưới) — lưới ký tự Endesga 32
// như hình nhân vật (xem bảng mã ở battleSprites.ts). NỢ DEBT-007: hình tự vẽ, tạm thời.
import type { PixelSprite } from '../../../app/pixelSprites';
import type { SkillKind, UpgradeKind } from '../logic/battleTypes';

const coin: PixelSprite = [
  '..PPPP..',
  '.PBBBBP.',
  'PBJBBBAP',
  'PBJBBBAP',
  'PBBBBBAP',
  'PBBBBAAP',
  '.PAAAAP.',
  '..PPPP..',
];

const star: PixelSprite = [
  '...P...',
  '..PBP..',
  'PPPBPPP',
  'PBBBBBP',
  '.PBBBP.',
  '.PBPBP.',
  '.PP.PP.',
];

const sword: PixelSprite = [
  '.........PPP',
  '........PJKP',
  '.......PJKP.',
  '......PJKP..',
  '.....PJKP...',
  '.PP.PJKP....',
  '.PAPJKP.....',
  '..PAKP......',
  '.P5PAP......',
  'P5P.PP......',
  'PP..........',
  '............',
];

const axe: PixelSprite = [
  '............',
  '..PPPP......',
  '.PKJJLP.....',
  'PKJJLLP.....',
  'PKJLLP5P....',
  '.PKLLP55P...',
  '..PPP.P55P..',
  '.......P55P.',
  '........P55P',
  '.........PP.',
  '............',
  '............',
];

const spear: PixelSprite = [
  '.........PP.',
  '........PJKP',
  '.......PJKP.',
  '......PPKP..',
  '.....P4PP...',
  '....P4P.....',
  '...P4P......',
  '..P4P.......',
  '.P4P........',
  'P4P.........',
  'PP..........',
  '............',
];

const bow: PixelSprite = [
  '..PPP.......',
  '.P55P.......',
  '..PP5P......',
  '..PJP5P.....',
  '..PJ.P5P....',
  '..PJ..P5P...',
  '..PJ..P5P...',
  '..PJ.P5P....',
  '..PJP5P.....',
  '..PP5P......',
  '.P55P.......',
  '..PPP.......',
];

// F19: ba vũ khí mới — Búa (đầu búa vuông), Lưỡi hái (lưỡi cong trên cán dài), Nỏ (cánh cung ngang trên báng).
const hammer: PixelSprite = [
  '.PPPPP......',
  'PJJJKKP.....',
  'PJKKKLP.....',
  'PKKLLLP.....',
  '.PPPP5PP....',
  '.....P55P...',
  '......P55P..',
  '.......P55P.',
  '........P55P',
  '.........PP.',
  '............',
  '............',
];

const scythe: PixelSprite = [
  '....PPPPPPP.',
  '..PPJJJJKK5P',
  '.PJKPPPPPP5P',
  'PJKP.....P5P',
  'PKP.....P5P.',
  '.P.....P5P..',
  '......P5P...',
  '.....P5P....',
  '....P5P.....',
  '...P5P......',
  '..P5P.......',
  '..PP........',
];

const crossbow: PixelSprite = [
  '.....PP.....',
  '....PJKP....',
  'PPPPPKKPPPPP',
  'P5555KK5555P',
  'PPPPP55PPPPP',
  '....P55P....',
  '....P55P....',
  '....P55P....',
  '....P55P....',
  '....P44P....',
  '....P44P....',
  '....PPPP....',
];

const iceRain: PixelSprite = [
  '...PPPP.....',
  '..PJJJJPP...',
  '.PJJJJJJJP..',
  'PJJJJJJJJKP.',
  'PKKKKKKKKKP.',
  '.PPPPPPPPP..',
  '..I...I...I.',
  '..I...I...I.',
  '....I...I...',
  '....I...I...',
  '..I...I...I.',
  '............',
];

const fireball: PixelSprite = [
  '......PP....',
  '.....P99P...',
  '....P9AA9P..',
  '...P9ABBA9P.',
  '..P9ABJJBA9P',
  '..P9ABJJBA9P',
  '..P9AABBAA9P',
  '...P99AA99P.',
  '....P0990P..',
  '.....PPPP...',
  '............',
  '............',
];

const hp: PixelSprite = [
  '............',
  '............',
  '..PPP..PPP..',
  '.PT88PP888P.',
  '.PT8888888P.',
  '.P88888888P.',
  '..P888888P..',
  '...P8888P...',
  '....P88P....',
  '.....PP.....',
  '............',
  '............',
];

const crit: PixelSprite = [
  '.......PP...',
  '......PBP...',
  '.....PBP....',
  '....PBBP....',
  '...PBBBPPP..',
  '..PPPPBBBP..',
  '.....PBBP...',
  '....PBBP....',
  '....PBP.....',
  '...PBP......',
  '...PP.......',
  '............',
];

const heal: PixelSprite = [
  '............',
  '....PPPP....',
  '....PCCP....',
  '....PCCP....',
  '.PPPPCCPPPP.',
  '.PCCCCCCCCP.',
  '.PCCCCCCCCP.',
  '.PPPPCCPPPP.',
  '....PCCP....',
  '....PCCP....',
  '....PPPP....',
  '............',
];

const luck: PixelSprite = [
  '............',
  '..PPP..PPP..',
  '.PCCCPPCCCP.',
  '.PCCCCCCCDP.',
  '..PCCDDCDP..',
  '.PCCCDDCCCP.',
  '.PCCCCCCCDP.',
  '..PPPPDPPP..',
  '......PDP...',
  '.......PDP..',
  '........PP..',
  '............',
];

const bag: PixelSprite = [
  '....PPPP....',
  '...PP..PP...',
  '..PPPPPPPP..',
  '.P33333334P.',
  'P3333333334P',
  'P333BBA3334P',
  'P33BBBBA334P',
  'P333BBA3334P',
  'P3333333344P',
  '.P44444444P.',
  '..PPPPPPPP..',
  '............',
];

const up: PixelSprite = [
  '.....PP.....',
  '....PCCP....',
  '...PCCCCP...',
  '..PCCCCCCP..',
  '.PCCCCCCCCP.',
  '.PPPPCCPPPP.',
  '....PCCP....',
  '....PCCP....',
  '....PCDP....',
  '....PDDP....',
  '....PPPP....',
  '............',
];

export const UI_SPRITES = {
  coin,
  star,
  sword,
  axe,
  spear,
  bow,
  hammer,
  scythe,
  crossbow,
  iceRain,
  fireball,
  hp,
  crit,
  heal,
  luck,
  bag,
  up,
} as const;

export type UiSprite = keyof typeof UI_SPRITES;

/** Hình theo tên vũ khí trong cấu hình (thêm vũ khí mới thì thêm dòng ở đây — test nhắc). */
export const WEAPON_ICON: Readonly<Record<string, UiSprite>> = {
  Kiếm: 'sword',
  Rìu: 'axe',
  Giáo: 'spear',
  Cung: 'bow',
  Búa: 'hammer',
  'Lưỡi hái': 'scythe',
  Nỏ: 'crossbow',
};

export const SKILL_ICON: Readonly<Record<SkillKind, UiSprite>> = {
  iceRain: 'iceRain',
  fireball: 'fireball',
};

export const UPGRADE_ICON: Readonly<Record<UpgradeKind, UiSprite>> = {
  hp: 'hp',
  crit: 'crit',
  heal: 'heal',
  luck: 'luck',
};
