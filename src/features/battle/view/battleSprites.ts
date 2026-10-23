// NỢ DEBT-007: hình nhân vật và quái vẽ bằng lưới ký tự, tạm thời.
// Bảng mã: 0 ink(viền) 1 plum 2 crimson 3 orange 4 sand 5 lime 6 grass 7 teal
//          8 navy 9 blue A sky B cyan C white D mist E slate F shadow  · '.' = trong suốt
import type { PixelSprite } from '../../../app/pixelSprites';

/** Hiệp sĩ chibi áo xanh — phe người chơi (tông xanh dương + vàng). 16×16. */
const hero: PixelSprite = [
  '......0000......',
  '....00999900....',
  '...0999AA9990...',
  '..099999999990..',
  '..099000000990..',
  '..090444444090..',
  '..090404404090..',
  '..090444444090..',
  '...0004444000...',
  '..099999999990..',
  '.0DD09944990DD0.',
  '.0DD09999990DD0.',
  '..000999999000..',
  '....09900990....',
  '....08800880....',
  '....00000000....',
];

/** Slime đỏ — phe quái (tông đỏ/tím). 12×10. */
const slime: PixelSprite = [
  '....0000....',
  '..00222200..',
  '.0222C22220.',
  '.02CC222220.',
  '022222222220',
  '022002200220',
  '022222222220',
  '021222222120',
  '.0111111110.',
  '..00000000..',
];

/** F06: Slime Vua — trùm màn cuối: tím, đội vương miện vàng, to hơn slime thường. 16×14. */
const slimeKing: PixelSprite = [
  '....0..00..0....',
  '...0400440040...',
  '...0434444340...',
  '...0444444440...',
  '..001111111100..',
  '.01CC1111111110.',
  '01C1111111111110',
  '0111CC1111CC1110',
  '0111C01111C01110',
  '0111111111111110',
  '0111111001111110',
  '0111111111111110',
  '.0F1111111111F0.',
  '..000000000000..',
];

/** Tên hình quái trùng tên loại quái (MonsterKind) để view lấy hình theo `monster.kind`. */
export const BATTLE_SPRITES = { hero, slime, slimeKing } as const;

/** Phóng to nguyên lần để giữ nét pixel. */
export const SPRITE_SCALE = { hero: 2, slime: 2, slimeKing: 2 } as const;
