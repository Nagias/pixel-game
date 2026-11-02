# Làm lại giao diện mobile (F18) — kế hoạch làm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Game trông và đi như game mobile kiểu Micro RPG: mở game là bản đồ màn chơi, có bảng trước trận,
trận đấu trên khung cảnh pixel vẽ bằng code, thẻ vũ khí có hình — luật chơi giữ nguyên, trừ luật mới "chơi
lại màn đã qua không nhận vàng".

**Architecture:** Đổi bảng màu sang Endesga 32 trong `palette.ts` (mọi màu vẫn một nguồn). Khung cảnh do một
hàm thuần `paintScenery` (không Phaser) vẽ ra mảng tên màu ở nửa độ phân giải, cầu nối Phaser biến thành
texture một lần rồi phóng ×2. Luật chơi lại và lưu đồ nằm trong `profile/logic` (hồ sơ phiên bản 5). Màn
chuẩn bị (`LoadoutScene`) được thay bằng `MapScene` (bản đồ + bảng trước trận) và `WeaponsScene`.

**Tech Stack:** TypeScript, Phaser 3.90, Vite, Vitest, Playwright (không thêm thư viện).

**Spec:** `docs/superpowers/specs/2026-11-02-giao-dien-mobile-design.md` (chủ dự án duyệt 02/11/2026).
Bản phác: `docs/superpowers/specs/mockups/`.

## Global Constraints

- Khung game 360×640, `pixelArt: true`; chỉ thao tác chạm (đường cấm #15).
- Màu chỉ ở `src/shared/palette.ts`: đúng 32 màu Endesga 32, không màu nào khác (đường cấm #4).
- Không đổi luật hay con số trong `battleConfig.ts`, `upgrades.ts`, `shop.ts`, `loot.ts`. Luật mới duy nhất:
  chơi lại màn đã qua không cộng vàng, không rơi đồ, không đổi màn đã mở; món thuê vẫn trừ trận.
- Hồ sơ cũ (phiên bản 1–4) đọc lên không mất vàng, màn đã mở, nâng cấp, cấp vũ khí, bảo hiểm rơi đồ, món thuê.
- Không thêm thư viện, không tải gì từ mạng lúc chạy (đường cấm #11, #14).
- Chữ trong game tiếng Việt có dấu; tên biến/hàm/file tiếng Anh; comment ngắn giải thích vì sao.
- Mỗi đợt = 1 branch từ `main` mới nhất + 1 PR; "xong" = `npm run check` xanh + ảnh E2E + thử tay theo
  `docs/MANUAL_TEST.md` ở khung 375×760; `FEATURE_MAP.md` cập nhật trong cùng PR (mục F18).
- Đồ họa: khung cảnh 180×320 điểm phóng ×2; hình nhân vật giữ kích thước, phóng ×2 như hiện nay.

## Review Focus

1. **Hồ sơ cũ có đồ đang mang trỏ tới vũ khí không còn trong cấu hình** (đổi tên/bỏ món) → về bộ mặc định, không
   sập. Test ở Task 2.2 (`fromSavedLoadout` trả null với tên lạ, tầm sai, thiếu tầm).
2. **Chơi lại màn 20 sau khi đã phá đảo** → vẫn là chơi lại (không vàng), `clearedAll` giữ true. Test ở Task 2.1.
3. **Chạm hai lần thật nhanh** vào nút màn / nút chơi / thẻ vũ khí khi scene đang chuyển → chỉ mở một lần. Test
   E2E ở Task 4.4 (chạm đúp nút chơi chỉ vào một trận).
4. **Chạm vào khe giữa các nút màn, giữa thẻ, mép thanh nút dưới** → không làm gì. Test ở các file layout
   (`mapTapAt`, `weaponsTapAt`, `navTapAt` trả null ở khe).
5. **Bộ nhớ trình duyệt bị chặn** (chế độ riêng tư) khi lưu đồ đang mang → game chơi tiếp với đồ vừa chọn trong
   phiên, không sập. Test E2E ở Task 4.3: `page.addInitScript` làm `localStorage.setItem` ném lỗi, chọn Rìu ở màn
   Vũ khí, về bảng trước trận vẫn thấy Rìu, vào trận cầm Rìu.

---

## Đợt A — Bảng màu 32 màu và tô lại hình (branch `feat/bang-mau-32`)

Kết quả thấy được: game y như cũ về bố cục, nhưng toàn bộ màu đổi sang Endesga 32.

### Task 1.1: Bảng màu Endesga 32

**Files:**

- Modify: `src/shared/palette.ts`, `src/shared/palette.test.ts`
- Modify: mọi chỗ dùng tên màu cũ: `src/app/createGame.ts`, `src/main.ts`,
  `src/features/battle/view/{BattleScene,LoadoutScene,UpgradeScene,ShopScene,weaponTierStyle}.ts`

**Interfaces:**

- Produces: `PALETTE` (32 khóa dưới đây), `type PaletteColor`, `colorNumber(color)`, `SPRITE_PALETTE`
  (32 ký tự → màu).

Bảng màu, theo thứ tự chuẩn của Endesga 32 (thứ tự này là thứ tự ký tự sprite `0`–`9`, `A`–`V`):

| Ký tự | Tên      | Mã        | Ký tự | Tên       | Mã        |
| ----- | -------- | --------- | ----- | --------- | --------- |
| 0     | `rust`   | `#be4a2f` | G     | `navy`    | `#124e89` |
| 1     | `copper` | `#d77643` | H     | `blue`    | `#0099db` |
| 2     | `cream`  | `#ead4aa` | I     | `cyan`    | `#2ce8f5` |
| 3     | `tan`    | `#e4a672` | J     | `white`   | `#ffffff` |
| 4     | `clay`   | `#b86f50` | K     | `mist`    | `#c0cbdc` |
| 5     | `bark`   | `#733e39` | L     | `steel`   | `#8b9bb4` |
| 6     | `umber`  | `#3e2731` | M     | `slate`   | `#5a6988` |
| 7     | `maroon` | `#a22633` | N     | `dusk`    | `#3a4466` |
| 8     | `red`    | `#e43b44` | O     | `shadow`  | `#262b44` |
| 9     | `orange` | `#f77622` | P     | `ink`     | `#181425` |
| A     | `amber`  | `#feae34` | Q     | `scarlet` | `#ff0044` |
| B     | `yellow` | `#fee761` | R     | `plum`    | `#68386c` |
| C     | `leaf`   | `#63c74d` | S     | `magenta` | `#b55088` |
| D     | `grass`  | `#3e8948` | T     | `pink`    | `#f6757a` |
| E     | `pine`   | `#265c42` | U     | `skin`    | `#e8b796` |
| F     | `forest` | `#193c3e` | V     | `dune`    | `#c28569` |

Đổi tên màu cũ ở mọi chỗ dùng (giữ vai trò, đổi sang màu gần nhất): `ink→ink`, `plum→plum`, `crimson→red`,
`orange→orange`, `sand→yellow`, `lime→leaf`, `grass→grass`, `teal→forest`, `navy→dusk`, `blue→navy`,
`sky→blue`, `cyan→cyan`, `white→white`, `mist→mist`, `slate→slate`, `shadow→shadow`.

- [ ] **Step 1: Sửa test `palette.test.ts` cho bảng mới (đỏ)**

```ts
it('bảng có đúng 32 màu, không trùng mã', () => {
  expect(Object.keys(PALETTE)).toHaveLength(32);
  expect(new Set(Object.values(PALETTE)).size).toBe(32);
});
it('đổi màu bảng sang số 0xRRGGBB', () => {
  expect(colorNumber('ink')).toBe(0x181425);
  expect(colorNumber('white')).toBe(0xffffff);
});
it('ký tự sprite 0–9, A–V theo đúng thứ tự Endesga 32', () => {
  expect(Object.keys(SPRITE_PALETTE).join('')).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUV');
  expect(SPRITE_PALETTE['0']).toBe(PALETTE.rust);
  expect(SPRITE_PALETTE.P).toBe(PALETTE.ink);
});
```

- [ ] **Step 2: Chạy `npx vitest run src/shared/palette.test.ts`** — mong FAIL (thiếu màu, sai mã).
- [ ] **Step 3: Viết lại `PALETTE` và `SPRITE_PALETTE` theo bảng trên; đổi tên màu ở các file view theo bảng đổi tên.**
      Sửa comment đầu file: "Endesga 32 (https://lospec.com/palette-list/endesga-32)".
- [ ] **Step 4: Chạy `npm run typecheck && npx vitest run`** — mong PASS (tên màu cũ còn sót sẽ lỗi kiểu).

### Task 1.2: Tô lại hình nhân vật, quái theo bảng mới

**Files:**

- Modify: `src/features/battle/view/battleSprites.ts`, `src/features/battle/view/battleSprites.test.ts`
- Modify: `src/app/pixelSprites.ts` (chỉ comment: ký tự 0–9, A–V)

**Interfaces:**

- Consumes: `SPRITE_PALETTE` (Task 1.1).
- Produces: `BATTLE_SPRITES` cùng tên khóa, cùng kích thước từng hình như hiện nay.

- [ ] **Step 1: Thêm test (đỏ)** trong `battleSprites.test.ts`:

```ts
it('mọi ký tự trong hình là màu của bảng hoặc "." (trong suốt)', () => {
  for (const [name, rows] of Object.entries(BATTLE_SPRITES))
    for (const ch of rows.join(''))
      expect(ch === '.' || ch in SPRITE_PALETTE, `${name}: ${ch}`).toBe(true);
});
it('giữ nguyên kích thước hình (không đổi chỗ đứng, va chạm)', () => {
  expect(size(BATTLE_SPRITES.hero)).toEqual([16, 16]);
  expect(size(BATTLE_SPRITES.slime)).toEqual([12, 10]);
  expect(size(BATTLE_SPRITES.treant)).toEqual([16, 16]);
  // … đủ 12 hình, lấy số từ file hiện tại trước khi sửa
});
```

- [ ] **Step 2: Chụp ảnh trận đấu trước khi đổi** (`npm run e2e`, giữ ảnh trong `test-results/`). Hai test trên là
      lưới an toàn nên qua ngay; đổi màu hình là việc nhìn, kiểm bằng ảnh trước/sau và thử tay.
- [ ] **Step 3: Đổi ký tự từng hình**: trước hết đổi máy móc theo bảng đổi tên ở Task 1.1 (ký tự Sweetie cũ →
      ký tự Endesga mới: `0→P 1→R 2→8 3→9 4→B 5→C 6→D 7→F 8→N 9→G A→H B→I C→J D→K E→M F→O`), rồi tô thêm khối:
      mỗi hình thêm một sắc tối ở mép dưới/phải và một sắc sáng ở mép trên/trái của mảng màu chính (ví dụ
      slime: thân `8` red, tối `7` maroon, sáng `T` pink; hiệp sĩ: áo `G` navy, sáng `H` blue; mặt `U` skin).
      Giữ viền `P` ink. Nhân vật chính tông xanh dương + vàng, quái đỏ/tím/xanh lá (`ART_STYLE.md`).
- [ ] **Step 4: Chạy `npx vitest run`** — mong PASS.

### Task 1.3: Tài liệu, kiểm chứng và PR đợt A

**Files:** `docs/ART_STYLE.md`, `CLAUDE.md` (bảng mục 3, dòng "Dùng màu"), `FEATURE_MAP.md` (thêm F18, trạng
thái "Đang làm — đợt A xong"), `DEBT.md` (DEBT-007: ghi đã tô lại theo 32 màu, vẫn là lưới ký tự).

- [ ] **Step 1:** `ART_STYLE.md`: thay quy tắc 1 bằng "chỉ dùng 32 màu Endesga 32", quy tắc 3 thành "vùng
      tấn công: trắng phủ 45% lên cỏ, viền trắng" (áp dụng từ đợt C), thêm mục "Khung cảnh vẽ bằng code" tóm
      tắt mục 6 của spec. `CLAUDE.md`: "bảng Sweetie 16" → "bảng Endesga 32" (chủ dự án đã duyệt trong spec, mục 4.3).
- [ ] **Step 2:** `npm run check` — mong xanh hết (E2E không phụ thuộc màu).
- [ ] **Step 3:** Thử tay C1–C3 của `MANUAL_TEST.md`, chụp màn chuẩn bị + trận đấu.
- [ ] **Step 4:** Commit `feat: F18 đợt A — đổi bảng màu sang Endesga 32, tô lại hình nhân vật và quái`, đẩy,
      mở PR có ảnh trước/sau.

---

## Đợt B — Hồ sơ phiên bản 5: lưu đồ đang mang, chơi lại không nhận vàng (branch `feat/choi-lai-luu-do`)

Kết quả thấy được: tắt game mở lại vẫn còn đồ đã chọn; mở `?level=N` với màn đã qua thì chơi được nhưng màn
kết quả ghi "Chơi lại: không nhận vàng".

### Task 2.1: Luật chơi lại và hồ sơ phiên bản 5

**Files:**

- Modify: `src/features/profile/logic/{profileTypes,profileConfig,profile}.ts`, `profile.test.ts`,
  `src/features/profile/index.ts`

**Interfaces:**

- Produces:
  - `Profile` thêm `readonly clearedAll: boolean` và `readonly loadout: SavedLoadout | null`.
  - `interface SavedLoadout { readonly weapons: readonly string[]; readonly skill: string | null }` — tên vũ
    khí theo thứ tự tầm gần → xa, tên skill (`SkillKind`) hoặc null. Lưu bằng tên để đổi thứ tự cấu hình
    không làm lệch đồ.
  - `type LevelStatus = 'cleared' | 'current' | 'locked'`
  - `levelStatus(profile: Profile, level: number, levelCount: number): LevelStatus`
  - `isReplay(profile: Profile, level: number, levelCount: number): boolean` (= `levelStatus(...) === 'cleared'`)
  - `withSavedLoadout(profile: Profile, loadout: SavedLoadout): Profile`
  - `PROFILE_VERSION = 5`; `index.ts` xuất thêm `isReplay`, `levelStatus`, `withSavedLoadout`,
    `type SavedLoadout`, `type LevelStatus`.

- [ ] **Step 1: Viết test (đỏ)** trong `profile.test.ts`:

```ts
describe('levelStatus', () => {
  const p = { ...emptyProfile(), unlockedLevel: 3 };
  it('màn nhỏ hơn màn đã mở là đã qua, bằng là đang tới, lớn hơn là chưa mở', () => {
    expect(levelStatus(p, 2, 20)).toBe('cleared');
    expect(levelStatus(p, 3, 20)).toBe('current');
    expect(levelStatus(p, 4, 20)).toBe('locked');
  });
  it('đã phá đảo thì màn cuối cũng là đã qua', () => {
    expect(levelStatus({ ...p, unlockedLevel: 19, clearedAll: true }, 19, 20)).toBe('cleared');
    expect(levelStatus({ ...p, unlockedLevel: 19 }, 19, 20)).toBe('current');
  });
});
describe('applyBattleResult — chơi lại', () => {
  const p = {
    ...emptyProfile(),
    gold: 50,
    unlockedLevel: 5,
    weaponTiers: { Kiếm: 1 },
    lootPity: { x: 2 },
  };
  const loot = { weaponTiers: { Kiếm: 3 }, lootPity: { x: 0 } };
  it('chơi lại màn đã qua: không cộng vàng, không nhận đồ rơi, không đổi màn đã mở', () => {
    const next = applyBattleResult(p, { level: 2, won: true, gold: 9, loot }, 20);
    expect(next.gold).toBe(50);
    expect(next.weaponTiers).toEqual({ Kiếm: 1 });
    expect(next.lootPity).toEqual({ x: 2 });
    expect(next.unlockedLevel).toBe(5);
  });
  it('chơi lại vẫn trừ món thuê', () => {
    const next = applyBattleResult(
      { ...p, rentals: { Giáo: 3 } },
      { level: 2, won: false, gold: 0, rentals: { Giáo: 2 } },
      20,
    );
    expect(next.rentals).toEqual({ Giáo: 2 });
  });
  it('thắng màn cuối lần đầu thì phá đảo; chơi lại màn cuối sau đó không vàng', () => {
    const won = applyBattleResult(
      { ...p, unlockedLevel: 19 },
      { level: 19, won: true, gold: 10 },
      20,
    );
    expect(won.clearedAll).toBe(true);
    expect(won.gold).toBe(60);
    expect(applyBattleResult(won, { level: 19, won: true, gold: 10 }, 20).gold).toBe(60);
  });
  it('màn đang tới vẫn cộng vàng như cũ', () => {
    expect(applyBattleResult(p, { level: 5, won: false, gold: 4 }, 20).gold).toBe(54);
  });
});
describe('hồ sơ phiên bản 5', () => {
  it('hồ sơ phiên bản 4 đọc lên giữ mọi thứ, chưa phá đảo, chưa có đồ lưu', () => {
    const v4 = {
      version: 4,
      gold: 7,
      unlockedLevel: 3,
      upgrades: { hp: 1 },
      weaponTiers: {},
      lootPity: {},
      rentals: { Giáo: 2 },
    };
    expect(readProfile(storeWith(v4))).toEqual({
      ...v4,
      version: 5,
      clearedAll: false,
      loadout: null,
    });
  });
  it('lưu và đọc lại đồ đang mang', () => {
    const p = withSavedLoadout(emptyProfile(), {
      weapons: ['Rìu', 'Giáo', 'Cung'],
      skill: 'fireball',
    });
    expect(readProfile(roundTrip(p)).loadout).toEqual({
      weapons: ['Rìu', 'Giáo', 'Cung'],
      skill: 'fireball',
    });
  });
  it('đồ lưu sai kiểu (weapons không phải mảng chữ, skill là số) → coi như hỏng, cất bản sao, dùng hồ sơ trống', () => {
    /* theo mẫu test dữ liệu hỏng hiện có */
  });
});
```

(`storeWith`, `roundTrip`: dùng lại hàm phụ đang có trong `profile.test.ts`, thêm nếu chưa có.)

- [ ] **Step 2: Chạy `npx vitest run src/features/profile`** — mong FAIL.
- [ ] **Step 3: Cài đặt.** `parseProfile`: thêm nhánh `version === 4` → `{ ...emptyProfile(), …v4, version: 5 }`;
      phiên bản 5 kiểm `clearedAll` là boolean, `loadout` là null hoặc `{ weapons: string[], skill: string | null }`.
      `applyBattleResult`: tính `replay = isReplay(profile, result.level, levelCount)` **trước** khi cộng; replay
      → giữ `gold`, `unlockedLevel`, `weaponTiers`, `lootPity`, chỉ áp `rentals`; không replay → như cũ, thêm
      `clearedAll: profile.clearedAll || (result.won && result.level === levelCount - 1)`. Cập nhật lịch sử phiên
      bản trong `profileConfig.ts`.
- [ ] **Step 4: Chạy `npx vitest run src/features/profile`** — mong PASS.

### Task 2.2: Đổi qua lại đồ đang mang ↔ dạng lưu

**Files:** Modify `src/features/battle/logic/loadout.ts`, `loadout.test.ts`

**Interfaces:**

- Consumes: `SavedLoadout` (Task 2.1, import type qua `../../profile`).
- Produces:
  - `toSavedLoadout(loadout: Loadout, config: BattleConfig): SavedLoadout`
  - `fromSavedLoadout(saved: SavedLoadout | null, config: BattleConfig): Loadout | null` — null khi: saved null,
    tên vũ khí không có trong cấu hình, hai món cùng tầm, thiếu tầm so với `defaultLoadout`, skill không phải
    `SkillKind`. Kết quả hợp lệ thì qua được `validateLoadout`.

- [ ] **Step 1: Test (đỏ):** đi-về giữ nguyên (`fromSavedLoadout(toSavedLoadout(l, c), c)` bằng `l`, kể cả có
      skill); tên lạ `['Kiếm','Giáo','Nỏ']` → null; `['Kiếm','Rìu','Cung']` (hai món tầm gần) → null; thiếu tầm
      `['Kiếm','Giáo']` → null; `skill: 'lightning'` → null; `null` → null.
- [ ] **Step 2–4:** chạy (FAIL) → cài đặt (tìm vũ khí theo `name` trong `config.weapons`) → chạy (PASS).

### Task 2.3: Nối vào màn hiện có + màn kết quả

**Files:** Modify `src/features/battle/view/LoadoutScene.ts`, `src/features/battle/view/BattleScene.ts`,
`e2e/support/battleDriver.ts`, `e2e/battle.spec.ts`

**Interfaces:**

- Consumes: `isReplay`, `withSavedLoadout`, `toSavedLoadout`, `fromSavedLoadout`.
- Produces: `BattleSnapshot.replay: boolean`; `LoadoutSnapshot` không đổi.

- [ ] **Step 1: E2E (đỏ)** trong `battle.spec.ts`:
  - "Đợt B: đồ đang mang được lưu — chọn Rìu, vào trận, tải lại trang: màn chuẩn bị vẫn chọn Rìu".
  - "Đợt B: chơi lại màn đã qua không nhận vàng — hồ sơ mở tới màn 3, `?level=1`, thắng màn 1: vàng trong hồ sơ
    không đổi, màn kết quả ghi 'Chơi lại: không nhận vàng', `snapshot.replay === true`".
- [ ] **Step 2:** `npm run e2e -- -g "Đợt B"` — mong FAIL.
- [ ] **Step 3:** `LoadoutScene.init`: không có `data.loadout` thì dùng
      `fromSavedLoadout(profile.loadout, config) ?? defaultLoadout(config)`; bấm "VÀO TRẬN" thì lưu bằng
      `saveProfile(withSavedLoadout(profile, toSavedLoadout(loadout, config)))` (lưu hỏng thì vẫn vào trận). Skill nhớ qua hồ sơ thay cho biến `lastSkill` (xóa biến đó).
      `BattleScene`: `replay = isReplay(loadProfile(), level, levels.length)` lúc `init`; `saveRewards` khi replay
      không tính `lootAfterBattle`, dòng vàng ghi `Chơi lại: không nhận vàng`, không hiện dòng rơi đồ.
- [ ] **Step 4:** Rà các E2E hiện có dùng `seedProfile({ unlockedLevel })` rồi chơi màn thấp hơn mà vẫn mong
      nhận vàng hoặc đồ rơi (ví dụ test "Đợt 5: quái hiếm…") — đổi `unlockedLevel` trong test cho bằng màn đang
      chơi (đây là sửa dữ liệu đầu vào của test cho đúng luật mới, ghi lý do trong PR — không phải sửa test cho
      xanh, CLAUDE.md đường cấm #8).
- [ ] **Step 5:** `npm run check` xanh; thử tay: chọn Rìu → tải lại trang → còn Rìu; `?level=1` khi đã mở màn 3
      → màn kết quả ghi "Chơi lại".
- [ ] **Step 6:** `FEATURE_MAP.md` F18 thêm mục "Luật chơi lại" (dẫn tới `profile.ts`); commit
      `feat: F18 đợt B — hồ sơ phiên bản 5, lưu đồ đang mang, chơi lại màn đã qua không nhận vàng`; PR.

---

## Đợt C — Khung cảnh vẽ bằng code + màn trận đấu mới (branch `feat/khung-canh-tran-dau`)

Kết quả thấy được: màn trận đấu giống bản phác `khung-canh-32-mau.html` (không còn đường lát đá).

### Task 3.1: Hàm vẽ khung cảnh thuần

**Files:**

- Create: `src/features/battle/view/scenery.ts`, `src/features/battle/view/scenery.test.ts`
- Create: `src/features/battle/view/sceneryForest.ts` (bộ dải màu Rừng rậm + 2 bố cục)

**Interfaces:**

- Consumes: `PaletteColor`, `src/shared/random.ts` (RNG có seed — dùng hàm đang có, không viết RNG mới).
- Produces:

```ts
export interface SceneryTheme {
  readonly ground: readonly [dark: PaletteColor, base: PaletteColor];
  readonly leaf: Ramp5;
  readonly autumn: Ramp5; // [viền, tối, vừa, sáng, rất sáng]
  readonly trunk: Ramp4;
  readonly stone: Ramp4;
  readonly water: Ramp4; // [viền/sâu…]
  readonly bank: readonly [PaletteColor, PaletteColor];
  readonly flowers: readonly PaletteColor[];
  readonly tuft: readonly [tip: PaletteColor, base: PaletteColor];
}
export type SceneryItem =
  | {
      readonly kind: 'tree';
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly autumn?: boolean;
    }
  | {
      readonly kind: 'bush';
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly autumn?: boolean;
    }
  | { readonly kind: 'rock'; readonly x: number; readonly y: number; readonly size: number }
  | {
      readonly kind: 'pond';
      readonly ellipses: readonly (readonly [cx: number, cy: number, rx: number, ry: number])[];
    };
export interface SceneryLayout {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly items: readonly SceneryItem[];
  /** Vùng cấm đồ trang trí (sân đấu, thanh trên/dưới, nút màn): chỉ cỏ, hoa, ngọn cỏ. */
  readonly keepClear: readonly (
    { readonly circle: readonly [cx: number, cy: number, r: number] } | { readonly rect: Rect }
  )[];
}
/** Mảng width×height tên màu, hàng trên xuống, trái sang phải. Cùng đầu vào → cùng kết quả. */
export function paintScenery(layout: SceneryLayout, theme: SceneryTheme): PaletteColor[];
/** Hình bao của một món (để test và để kiểm vùng cấm). */
export function itemBounds(item: SceneryItem): Rect;
// sceneryForest.ts
export const FOREST_THEME: SceneryTheme;
export const FOREST_BATTLE_SCENERY: SceneryLayout; // 180×320
export const FOREST_MAP_SCENERY: SceneryLayout; // 180×320
```

Thuật toán (bản phác là mẫu, xem script trong `mockups/2026-11-02-khung-canh-32-mau.html`): nền cỏ = nhiễu giá
trị 2 tầng (ô 24 và 7, trọng số 0,75/0,25), `< 0.30` tối, `0.30–0.33` chấm xen kẽ; 150 ngọn cỏ, 46 bông hoa
không đè lên ao; vẽ món theo `y` tăng dần; cây = bóng elip + thân 3 sắc có chân loe + tán 6–8 chùm tròn (vẽ chùm
thấp trước, chùm cao đè lên), mỗi điểm tô theo `-(nx·0.55 + ny·0.85) + nhiễu`, ngưỡng 0,78 / 0,2 / −0,3, mép dưới
chùm tô tối, viền ngoài tô màu viền; ao = hợp các elip, mép tối, rìa nông 3 điểm, bờ đất 2 điểm, 8 vệt sáng.
Dải màu Rừng rậm lấy đúng như bản phác (`e32` trong script): `ground: ['grass','leaf']`, `leaf: ['ink','forest',
'pine','grass','leaf']`, `autumn: ['ink','bark','rust','orange','amber']`, `trunk: ['ink','umber','bark','clay']`,
`water: ['navy','blue','cyan','white']`, `stone: ['ink','dusk','steel','mist']`, `bank: ['umber','bark']`,
`flowers: ['red','yellow','white','magenta']`, `tuft: ['yellow','grass']`. Bóng đổ tô bằng màu tối của nền cỏ
(`ground[0]`), không pha trộn, để mọi điểm ảnh đúng bảng màu.

Bố cục trận đấu (180×320, sân tâm (90,150) bán kính 80 = `ARENA_LAYOUT` chia 2): hàng cây trên `y` 32–60, cây
hai mép `y` 150–250 ở `x` ≈ −4 và 184, ao góc dưới trái quanh (30, 290), bụi và đá rải mép; `keepClear`: vòng
tròn sân bán kính 82, thanh trên `y < 28`, thanh dưới `y ≥ 258`. Bố cục bản đồ: cây viền bốn mép, bụi, đá, một ao
nhỏ; `keepClear` là hình bao các nút màn ở Task 4.1 (chia 2) + băng rôn + thanh trên/dưới.

- [ ] **Step 1: Test (đỏ)** `scenery.test.ts`:
  - `paintScenery` trả mảng dài `width*height`, mọi phần tử là khóa của `PALETTE`.
  - Gọi hai lần cùng đầu vào → bằng nhau (`toEqual`); đổi `seed` → khác.
  - Mọi màu xuất hiện đều thuộc các dải của theme (gom `Object.values(FOREST_THEME)` phẳng).
  - Với `FOREST_BATTLE_SCENERY` và `FOREST_MAP_SCENERY`: `itemBounds` của mọi món (trừ phần tán cây được phép
    tràn ra ngoài mép khung) không cắt vùng `keepClear`.
  - Bố cục rỗng (không món) → chỉ có màu cỏ, hoa, ngọn cỏ.
- [ ] **Step 2–4:** chạy (FAIL) → cài đặt → chạy (PASS).

### Task 3.2: Cầu nối texture + bộ khung giao diện dùng chung

**Files:**

- Create: `src/app/sceneryTexture.ts` (Phaser)
- Create: `src/features/battle/view/uiKit.ts` (Phaser), `src/features/battle/view/uiSprites.ts` (+ test hình)

**Interfaces:**

- Produces:
  - `registerSceneryTexture(scene: Scene, key: string, pixels: readonly PaletteColor[], width: number, height: number): string`
    — tạo canvas texture một lần (`textures.exists` thì dùng lại), ghi bằng `ImageData`.
  - `uiKit.ts`: `drawPanel(scene, rect: Rect, fill: PaletteColor, depth: number): GameObjects.Container` (khối
    viền `ink` 3 điểm, bóng `ink` lệch xuống 4 điểm, không bo góc); `goldPill(scene, x, y, depth): { set(amount: number): void }`;
    `hpBar(scene, depth): { place(x: number, y: number, hp: number, max: number): void; destroy(): void }`
    (rộng 30, cao 8, nền `shadow`, máu `yellow`, số trắng viền `ink` phía trên).
  - `UI_SPRITES` (lưới ký tự, đăng ký bằng `registerPixelSprites(scene, 'ui', UI_SPRITES)`): `coin` 8×8,
    `sword`, `axe`, `spear`, `bow` 12×12, `iceRain`, `fireball` 12×12, `star` 7×7, `hpUp`, `crit`, `heal`,
    `luck` 12×12, `play` 16×16, `close` 12×12, `shop`, `weapons`, `upgrade` 12×12. Tên vũ khí → hình:
    `WEAPON_ICON: Record<string, keyof typeof UI_SPRITES>` theo `name` trong cấu hình (`Kiếm→sword`,
    `Rìu→axe`, `Giáo→spear`, `Cung→bow`).
- [ ] **Step 1:** test hình (đỏ): mọi hàng cùng độ dài, ký tự thuộc bảng, mọi vũ khí trong `BATTLE_CONFIG.weapons`
      có trong `WEAPON_ICON`, mọi `SkillKind` có hình.
- [ ] **Step 2–4:** chạy → vẽ hình → chạy PASS. `sceneryTexture.ts` và `uiKit.ts` là Phaser, kiểm bằng E2E/thử tay
      ở Task 3.3.

### Task 3.3: Màn trận đấu mới

**Files:** Modify `src/features/battle/view/BattleScene.ts`, `battleLayout.ts`, `battleLayout.test.ts`,
`e2e/support/battleDriver.ts`, `e2e/battle.spec.ts`

**Interfaces:**

- Consumes: Task 3.1, 3.2, `isReplay` (đợt B).
- Produces trong `battleLayout.ts`: `TOP_BAR: Rect` (0,0,360,56), `TURN_TAB: Rect` (140,0,80,68),
  `QUEST_PILL: Rect` (230,11,122,34), `hpBarAnchor(point: Point, spriteHeight: number, scale: number): Point`.
  `ARENA_LAYOUT` và `WEAPON_BAR` **giữ nguyên số** (E2E chạm theo đó). `BattleSnapshot` giữ mọi trường cũ.

- [ ] **Step 1: Test bố cục (đỏ):** `TOP_BAR`, `TURN_TAB`, `QUEST_PILL` không đè sân (khoảng cách từ tâm sân tới
      hình chữ nhật > bán kính ngoài 160); không đè `WEAPON_BAR`; `hpBarAnchor` nằm trên đỉnh hình 4 điểm.
- [ ] **Step 2–3:** chạy FAIL → thêm hằng số/hàm → PASS.
- [ ] **Step 4: Đổi `BattleScene`:** nền = texture `FOREST_BATTLE_SCENERY` phóng ×2 ở (0,0); `drawArena` vẽ 24×6
      ô xen kẽ (ô lẻ `ink` alpha 0,10; ô chẵn `white` alpha 0,07), vòng giữa `white` 0,16, viền ngoài `ink` 0,25;
      `drawZone`: `white` alpha 0,45, viền `white` 2 điểm (vẫn đúng hình `zoneArcs` — test bố cục hiện có giữ
      nguyên). Thanh trên theo `TOP_BAR`: `goldPill` (vàng nhặt trong trận; chơi lại thì ghi "—"), thẻ "LƯỢT" + số
      còn lại, ô nhiệm vụ = hình quái nhiệm vụ + "đã hạ/cần" (không nhiệm vụ: hình quái đầu tiên + số còn lại), chữ
      nhỏ "Màn n/20" dưới ô vàng. Bỏ chữ "Máu: …" — thanh máu trên đầu hiệp sĩ; mỗi quái một `hpBar` trong
      `syncMonsters` (tạo cái thiếu, dời cái có, gỡ cái mất). Bóng elip `ink` alpha 0,25 dưới chân mọi đơn vị. Bỏ
      dòng gợi ý "Chạm sân: chém…". Thanh vũ khí: thẻ `navy` viền `ink`, thẻ đang cầm viền `leaf` 3 điểm, hình vũ
      khí bên trái + tên bên phải; cấp màu và sét giữ như `weaponTierStyle.ts`; nút skill nền `plum`.
      Màn kết quả: `drawPanel` giữa màn, chữ như cũ; chơi lại thì dòng vàng "Chơi lại: không nhận vàng".
- [ ] **Step 5:** E2E: cập nhật đường đọc chữ nếu test đọc text HUD (đọc qua snapshot, không đọc chữ thì không
      đổi); thêm test "Đợt C: mỗi quái có thanh máu đúng máu hiện tại" bằng snapshot mới
      `hpBars: { id: number; hp: number }[]`.
- [ ] **Step 6:** Thử tay: đo thời gian vẽ khung cảnh lần đầu (đọc `performance.now()` quanh
      `registerSceneryTexture` bằng một dòng log tạm, gỡ trước khi commit) — chấp nhận ≤ 100 ms trên máy dev;
      chụp màn trận đấu so với bản phác; chơi hết một màn.
- [ ] **Step 7:** `npm run check` xanh; `FEATURE_MAP.md` F18 mục "Trận đấu"; `docs/MANUAL_TEST.md` sửa C1/C2
      (không còn chữ "Máu:", vùng đánh trắng); PR với ảnh. Commit:
      `feat: F18 đợt C — khung cảnh rừng vẽ bằng code, màn trận đấu mới`.

---

## Đợt D — Bản đồ, bảng trước trận, màn Vũ khí, thanh nút dưới (branch `feat/ban-do`)

Kết quả thấy được: mở game là bản đồ Rừng rậm; chạm màn → bảng trước trận → vào trận → kết quả → về bản đồ.
Màn chuẩn bị cũ bị xóa.

### Task 4.1: Bố cục bản đồ, bảng trước trận, thanh nút dưới (thuần)

**Files:** Create `src/features/battle/view/mapLayout.ts`, `mapLayout.test.ts`, `navLayout.ts`, `navLayout.test.ts`

**Interfaces:**

- Produces:
  - `navLayout.ts`: `type NavTarget = 'shop' | 'weapons' | 'play' | 'upgrade'`; `NAV_BAR: Rect` (0,584,360,56);
    `navButtonRect(target: NavTarget): Rect` (thứ tự trái → phải: shop, weapons, play, upgrade; `play` to hơn,
    nhô lên 12 điểm); `navTapAt(x: number, y: number): NavTarget | null`.
  - `mapLayout.ts`: `levelNodeRect(level: number): Rect` (level đếm từ 0, 20 nút, rắn 5 hàng × 4 cột: hàng 0 ở dưới
    cùng chạy trái → phải, hàng 1 phải → trái…; nút thường 40×24, nút có trùm 50×30); `bannerRect: Rect`;
    `mapTapAt(x, y): { kind: 'level'; level: number } | { kind: 'nav'; target: NavTarget } | null`;
    `PREBATTLE_LAYOUT: { panel: Rect; play: Rect; close: Rect; gearCards: readonly Rect[] /* hiệp sĩ + 3 vũ khí */;
skillCard: Rect }`; `prebattleTapAt(x, y): 'play' | 'close' | 'gear' | null` (chạm ngoài bảng = null, không đóng
    bảng — tránh chạm nhầm).
- [ ] **Step 1: Test (đỏ):** 20 nút trong khung, không đè nhau, không đè băng rôn/thanh trên (y < 48)/thanh nút
      dưới; nút n và n+1 kề nhau (cùng hàng hoặc thẳng cột ở đầu hàng); `mapTapAt` giữa nút n → level n, khe giữa
      hai nút → null; `navTapAt` giữa mỗi nút → đúng target, khe → null; các ô của bảng trước trận nằm trong
      `panel` và không đè nhau; nút `play` của bảng không trùng chỗ nút `play` của thanh dưới (thanh dưới bị che khi
      bảng mở).
- [ ] **Step 2–4:** chạy FAIL → cài đặt (số cụ thể do người làm chọn, vừa khung 360×640) → PASS.

### Task 4.2: Màn Bản đồ + bảng trước trận

**Files:** Create `src/features/battle/view/MapScene.ts`; Modify `src/app/scenes.ts`,
`src/features/battle/index.ts`, `BattleScene.ts` (đi/về), `e2e/support/battleDriver.ts`

**Interfaces:**

- Consumes: Task 3.1–3.2, 4.1, `levelStatus`, `isReplay`, `fromSavedLoadout`, `chapterOf`, `parseLevelParam`.
- Produces:

```ts
export interface MapSceneData {
  readonly popupLevel?: number;
} // mở sẵn bảng trước trận của màn này
export interface MapSnapshot {
  readonly scene: 'map';
  readonly gold: number;
  readonly levels: readonly LevelStatus[]; // 20 phần tử
  readonly popup: null | {
    readonly level: number;
    readonly replay: boolean;
    readonly turns: number;
    readonly quest: { readonly kind: string; readonly count: number } | null;
    readonly monsterKinds: readonly string[]; // không trùng, theo thứ tự xuất hiện trong cấu hình màn
    readonly loadout: Loadout;
  };
  readonly canTap: boolean;
}
```

`BattleScene` nhận `{ level, loadout }` như cũ; chạm ở màn kết quả → `scene.start('map', { popupLevel:
  nextLevelIndex(...) })`. `?level=N` (đã mở khóa) → `MapScene` mở sẵn bảng màn N.

- [ ] **Step 1: E2E (đỏ)** — viết lại các test dùng màn chuẩn bị theo luồng mới, và thêm:
  - "Đợt D: mở game là bản đồ — 20 nút, màn 1 đang tới, còn lại chưa mở; chạm màn 3 (chưa mở) không có gì".
  - "Đợt D: chạm nút CHƠI mở bảng màn đang tới; bảng ghi nhiệm vụ, số lượt, quái sẽ gặp đúng cấu hình; X đóng bảng".
  - "Đợt D: thắng màn 1 → về bản đồ, bảng màn 2 mở sẵn; màn 1 hiện đã qua; chạm màn 1 → bảng ghi chơi lại".
  - "Đợt D: chạm đúp nút chơi của bảng chỉ vào một trận" (Review Focus 3).
  - `battleDriver.ts`: thay `openLoadout`/`startBattle`/`waitLoadoutReady` bằng `openMap(seed, level?)`,
    `tapLevel(level)`, `tapNav(target)`, `waitMapReady(): Promise<MapSnapshot>`, `startFromPopup()` — tọa độ lấy từ
    `mapLayout.ts`/`navLayout.ts`.
- [ ] **Step 2:** `npm run e2e` — mong FAIL.
- [ ] **Step 3: Cài `MapScene`:** nền = texture `FOREST_MAP_SCENERY` ×2; băng rôn "CHỦ ĐỀ 1 / RỪNG RẬM / n/20 màn"
      (`chapterOf`); đường nối giữa các nút (đoạn đã qua `white`, chưa mở `slate`); nút: đã qua `blue` chữ trắng,
      đang tới `yellow` chữ `ink`, chưa mở `mist` chữ `slate`; hình trùm cạnh mọi màn có quái trùm trong cấu hình
      màn; hiệp sĩ đứng trên nút đang tới (đã phá đảo: nút màn cuối); `goldPill` góc trên trái; thanh nút dưới vẽ
      theo `navLayout` (nút của màn đang mở nền `ink`). Chống chạm nhầm 500 ms như các scene hiện có (đếm theo
      khung hình). Bảng trước trận: nền bản đồ phủ `ink` alpha 0,7, `drawPanel` màu `white`, nội dung theo spec 5.3;
      chơi lại thì thêm dòng "Chơi lại: không nhận vàng" màu `red`. Thẻ hiệp sĩ ghi "Hiệp sĩ" + máu tối đa (đã cộng
      nâng cấp). Chạm thẻ vũ khí/skill → `WeaponsScene` với `returnTo: { popupLevel }`.
      `scenes.ts`: `[MapScene, BattleScene, WeaponsScene, UpgradeScene, ShopScene]` (WeaponsScene ở Task 4.3 — task
      này tạm đưa `MapScene` lên đầu, giữ `LoadoutScene` tới Task 4.3).
- [ ] **Step 4:** `npm run e2e` — test đợt D PASS.

### Task 4.3: Màn Vũ khí, xóa màn chuẩn bị cũ

**Files:** Create `src/features/battle/view/WeaponsScene.ts`, `weaponsLayout.ts`, `weaponsLayout.test.ts`;
Delete `LoadoutScene.ts`, `loadoutLayout.ts`, `loadoutLayout.test.ts`; Modify `scenes.ts`, `index.ts`,
`UpgradeScene.ts`, `ShopScene.ts` (bỏ `LoadoutSceneData`, quay về `map`), E2E.

**Interfaces:**

- Produces: `WeaponsSceneData { readonly returnTo: MapSceneData }`; `WeaponsSnapshot { scene: 'weapons'; gold;
loadout: Loadout; cards: readonly ({ kind: 'weapon'; weapon: number } | { kind: 'skill'; skill: SkillKind })[];
canTap }`; `weaponsTapAt(x, y): { kind: 'card'; index: number } | { kind: 'nav'; target: NavTarget } | null`;
  `equippedCardRects: readonly Rect[]` (3, hàng trên), `gridCardRect(index): Rect` (lưới 3 cột).
- [ ] **Step 1: Test (đỏ):** layout — thẻ trong khung, không đè, khe trả null, lưới đủ chỗ cho 4 vũ khí + 2 skill
      phía trên `NAV_BAR`. E2E — "Đợt D: màn Vũ khí — chạm Rìu thì Rìu vào tầm gần; về bảng trước trận thấy Rìu; tải
      lại trang vẫn Rìu"; "Đợt D: bộ nhớ bị chặn — chọn Rìu vẫn mang Rìu vào trận" (Review Focus 5); "Đợt D: skill
      chỉ hiện từ màn mở skill" (theo `isSkillUnlocked` của màn đang tới);
      chuyển các test cũ "B4…", "B6: màn chuẩn bị…" sang màn Vũ khí giữ nguyên ý kiểm.
- [ ] **Step 2–3:** FAIL → cài đặt: hàng "Đang mang" (3 thẻ to, hình, tên, cấp màu, "gần/vừa/xa"), dòng mô tả món
      đang chọn (`describeWeapon`), lưới thẻ (món thuê ghi "Hiếm · n trận"), mỗi chạm gọi `chooseWeapon` /
      `chooseSkill` rồi `saveProfile(withSavedLoadout(...))` — lưu hỏng thì vẫn giữ lựa chọn trong scene (Review
      Focus 5). Thanh nút dưới, nút "Vũ khí" nổi.
- [ ] **Step 4:** Xóa `LoadoutScene` và layout của nó; `grep -rn "loadout'" src e2e` không còn chỗ mở scene cũ.
- [ ] **Step 5:** `npm run check` xanh.

### Task 4.4: Kiểm chứng và PR đợt D

- [ ] **Step 1:** Thử tay theo `MANUAL_TEST.md` (viết lại C1: "Mở game thấy bản đồ…"; thêm mục bản đồ, bảng trước
      trận, màn Vũ khí, chơi lại). Chạm khe giữa các nút màn, chạm đúp nút chơi.
- [ ] **Step 2:** `FEATURE_MAP.md`: F18 mục Bản đồ / Bảng trước trận / Vũ khí; F07 ghi "thay bằng F18 (màn Vũ khí)".
- [ ] **Step 3:** Commit `feat: F18 đợt D — bản đồ màn chơi, bảng trước trận, màn Vũ khí`; PR có ảnh 3 màn.

---

## Đợt E — Nâng cấp và Cửa hàng dạng thẻ (branch `feat/nang-cap-cua-hang-the`)

### Task 5.1: Nâng cấp và Cửa hàng dạng thẻ, có thanh nút dưới

**Files:** Modify `UpgradeScene.ts`, `ShopScene.ts`, `upgradeLayout.ts`, `upgradeLayout.test.ts`; Create
`shopLayout.ts`, `shopLayout.test.ts`; Modify E2E driver/spec.

**Interfaces:**

- Consumes: `uiKit`, `UI_SPRITES`, `navLayout`.
- Produces: `upgradeCardRect(index): Rect`, `upgradeBuyRect(index): Rect`, `upgradeTapAt(x, y)` trả thêm
  `{ kind: 'nav'; target }`; tương tự `shopCardRect`, `shopBuyRect`, `shopTapAt`. Snapshot giữ trường cũ. Bỏ nút
  "XONG" (đi bằng thanh nút dưới).
- [ ] **Step 1: Test (đỏ):** 4 thẻ nâng cấp và 4 thẻ cửa hàng nằm trên `NAV_BAR`, không đè; nút mua trong thẻ; khe
      trả null. E2E các test "Đợt 4…", "Đợt 6…" đi bằng thanh nút dưới thay cho "XONG".
- [ ] **Step 2–3:** FAIL → cài đặt theo spec 5.7, 5.8 (băng rôn "NÂNG CẤP" / "CỬA HÀNG", thẻ có hình, nút mua có
      đồng xu; đủ vàng sáng, thiếu mờ, "TỐI ĐA"/"ĐÃ CÓ").
- [ ] **Step 4:** `npm run check` xanh; thử tay mua một nâng cấp, thuê một món, đi qua lại 4 nút thanh dưới.
- [ ] **Step 5:** `FEATURE_MAP.md` F18 hoàn tất (trạng thái "✅ Xong"), F14/F17 ghi giao diện mới; `TASKS.md` đánh
      dấu đợt; commit `feat: F18 đợt E — Nâng cấp và Cửa hàng dạng thẻ`; PR.

---

## Thứ tự và phụ thuộc

A → B → C → D → E, mỗi đợt gộp vào `main` rồi mới mở branch đợt sau. B không cần A (có thể làm song song nếu
muốn), C cần A, D cần B và C, E cần D.
