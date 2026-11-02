// NỢ DEBT-007: hình nhân vật và quái vẽ bằng lưới ký tự, tạm thời.
// Bảng mã Endesga 32 (xem SPRITE_PALETTE): P ink (viền) · J white · K mist · L steel · M slate · N dusk ·
// O shadow · G navy · H blue · I cyan · C leaf · D grass · E pine · 8 red · 7 maroon · T pink · R plum ·
// S magenta · 9 orange · 0 rust · A amber · B yellow · U skin · 2 cream · 4 clay · 5 bark · 6 umber · '.' trong suốt
// F18 đợt A: tô lại theo 32 màu — mỗi mảng màu chính có sắc sáng ở mép trên/trái, sắc tối ở mép phải/dưới.
import type { PixelSprite } from '../../../app/pixelSprites';

/** Hiệp sĩ chibi áo xanh — phe người chơi (tông xanh dương + vàng). 16×16. */
const hero: PixelSprite = [
  '......PPPP......',
  '....PPHHHHPP....',
  '...PHHHIIHHGP...',
  '..PHHHHHHHHHGP..',
  '..PHHPPPPPPHGP..',
  '..PHPUUUUUUPGP..',
  '..PHPUPUUPUPGP..',
  '..PHPUUUUUUPGP..',
  '...PPPUUUUPPP...',
  '..PHHHHHHHHHGP..',
  '.PKKPHHAAHGPKLP.',
  '.PKLPHHHHHGPLLP.',
  '..PPPHHHHHGPPP..',
  '....PHGPPHGP....',
  '....PNNPPNNP....',
  '....PPPPPPPP....',
];

/** Slime đỏ — phe quái (tông đỏ/tím). 12×10. */
const slime: PixelSprite = [
  '....PPPP....',
  '..PP8888PP..',
  '.P888J8887P.',
  '.P8JJ88887P.',
  'P8888888887P',
  'P88PP88PP87P',
  'P8888888887P',
  'P8T888888T7P',
  '.P77777777P.',
  '..PPPPPPPP..',
];

/** F06: Slime Vua — trùm màn cuối: tím, đội vương miện vàng, to hơn slime thường. 16×14. */
const slimeKing: PixelSprite = [
  '....P..PP..P....',
  '...PAPPAAPPAP...',
  '...PA8AAAA8AP...',
  '...PBBAAAAAAP...',
  '..PPRRRRRRRRPP..',
  '.PRJJSRRRRRRRRP.',
  'PRJSRRRRRRRRRRRP',
  'PRRRJJRRRRJJRRRP',
  'PRRRJPRRRRJPRRRP',
  'PRRRRRRRRRRRRRRP',
  'PRRRRRRPPRRRRRRP',
  'PRRRRRRRRRRRRRRP',
  '.PORRRRRRRRRROP.',
  '..PPPPPPPPPPPP..',
];

/** B3: Slime Pháo — quái bắn xa: slime cam, có nòng pháo trên đầu (chủ dự án duyệt hình A). 12×11. */
const slimeCannon: PixelSprite = [
  '.....PP.....',
  '....P99P....',
  '..PP9999PP..',
  '.P999J9990P.',
  '.P9JJ99990P.',
  'P9999999990P',
  'P99PP99PP90P',
  'P9999999990P',
  'P9899999980P',
  '.P00000000P.',
  '..PPPPPPPP..',
];

/** F12: Slime Con — slime đỏ nhỏ, 1 máu. 8×7. */
const slimeMini: PixelSprite = [
  '..PPPP..',
  '.PJ887P.',
  'P8J8887P',
  'P8P88P7P',
  'P888887P',
  '.P7777P.',
  '..PPPP..',
];

/** F12: Slime Lao — thân vàng cát, hai sừng trắng (lao 2 vòng mỗi lần tiến). 12×10. */
const slimeCharger: PixelSprite = [
  '.P........P.',
  'PJP......PJP',
  'PJPPPPPPPPJP',
  '.PABBAAAA9P.',
  'PAAAAAAAAA9P',
  'PAPPAAAAPP9P',
  'PAAAAAAAAA9P',
  'PA9AAAAAA99P',
  '.P99999999P.',
  '..PPPPPPPP..',
];

/** F12: Slime Ma — trắng ngà viền xanh băng, đáy gợn sóng; lượt chẵn vô hình (view vẽ mờ). 12×10. */
const slimeGhost: PixelSprite = [
  '....PPPP....',
  '..PPJJJJPP..',
  '.PJJJJJJJKP.',
  '.PJPPJJPPKP.',
  'PJJJJJJJJJKP',
  'PJJJJPPJJJKP',
  'PJJJJJJJJJKP',
  'PIJJJJJJJKIP',
  'PIPIIPPIIPIP',
  'PP.PP..PP.PP',
];

/** Rừng rậm: Yêu tinh — da xanh lá, tai nhọn, mắt đỏ, áo tối. 12×11. */
const goblin: PixelSprite = [
  '..PPPPPPPP..',
  '.PCCCCCCCDP.',
  'PPCC8CC8CDPP',
  'PCDCCCCCCDDP',
  '.PCC2222CDP.',
  '..PCCCCCDP..',
  '.PNNOOOOOOP.',
  'PCNOOOOOOODP',
  '.POOPPPPOOP.',
  '.P55P..P55P.',
  '.PPP....PPP.',
];

/** Rừng rậm: Sói rừng — lông xám, mõm trắng, nanh, mắt đỏ. 12×10. */
const wolf: PixelSprite = [
  '.PP......PP.',
  'PLLP....PLLP',
  'PKLLPPPPLLMP',
  'PKLLLLLLLLMP',
  'PL8PLLLLP8MP',
  'PLLLLLLLLLMP',
  '.PLLJJJJLMP.',
  '..PLJPPJMP..',
  '...PMMMMP...',
  '....PPPP....',
];

/** Rừng rậm: Yêu tinh cung thủ — mũ trùm cam, cầm cung vàng cát. 12×10. */
const goblinArcher: PixelSprite = [
  '..PPPPPPPP..',
  '.P99999990P.',
  'PP9C8998C9PP',
  '.P9CCCCCD9P.',
  '..PCC22CDP..',
  '.P9999999PAP',
  'PC9999990PAP',
  '.P9999999PAP',
  '.POOPPOOP.AP',
  '.PPP..PPP...',
];

/** Rừng rậm: Dơi đêm — cánh tím, mắt trắng; lượt chẵn vô hình (view vẽ mờ). 14×9. */
const bat: PixelSprite = [
  'P............P',
  'PR..........RP',
  'PRR..PPPP..RRP',
  'PRRRPSRRRPRRRP',
  'PRRRRJRRJRRRRP',
  'PRRRRRRRRRRRRP',
  '.PRRPJRRJPRRP.',
  '..PP.PRRP.PP..',
  '.....PPPP.....',
];

/** Rừng rậm: Người Cây — trùm màn 10 và 20: tán lá xanh, thân nâu, mắt vàng sáng. 16×16. */
const treant: PixelSprite = [
  '....PPPPPPPP....',
  '..PPDDCCCDDDPP..',
  '.PDDCCCDDDCCDDP.',
  'PDDCCDDCCCDDCDDP',
  'PEEEEEEEEEEEEEEP',
  '.PP5555555555PP.',
  '..P5555555556P..',
  '..P5BB5555BB6P..',
  '..P5555555556P..',
  '..P55P5555P56P..',
  '..P555PPPP556P..',
  '.P455555555564P.',
  'P4P5555555556P4P',
  '..P555PPPP556P..',
  '.P556P....P556P.',
  '.PPPPP....PPPPP.',
];

/** Tên hình quái trùng tên loại quái (MonsterKind) để view lấy hình theo `monster.kind`. */
export const BATTLE_SPRITES = {
  hero,
  slime,
  slimeKing,
  slimeCannon,
  slimeMini,
  slimeCharger,
  slimeGhost,
  goblin,
  wolf,
  goblinArcher,
  bat,
  treant,
} as const;

/** Phóng to nguyên lần để giữ nét pixel. */
export const SPRITE_SCALE = {
  hero: 2,
  slime: 2,
  slimeKing: 2,
  slimeCannon: 2,
  slimeMini: 2,
  slimeCharger: 2,
  slimeGhost: 2,
  goblin: 2,
  wolf: 2,
  goblinArcher: 2,
  bat: 2,
  treant: 2,
} as const;
