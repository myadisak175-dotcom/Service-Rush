# Security Audit — Service Rush

วันที่ตรวจ: 2026-08-24 · ขอบเขต: ทั้ง repository ที่ commit `0df2e8b`

## บริบทของระบบ

Service Rush เป็นเกม client-side ล้วน (Phaser + Vite) deploy เป็น static site บน GitHub Pages
ไม่มี backend, ไม่มี auth, ไม่มี network call, ไม่มี user-generated content
ผลที่ตามมาคือ attack surface หลักไม่ได้อยู่ที่ตัวเกม แต่อยู่ที่ **build/deploy pipeline** และ **ข้อมูลที่เกมเชื่อจาก localStorage**

## สรุปผล

| # | ระดับ | หัวข้อ | ไฟล์ |
|---|-------|--------|------|
| H1 | High | CI ไม่จำกัดสิทธิ์ token + `npm install` ไม่มี lockfile → เสี่ยง supply chain ยึด repo | `.github/workflows/ci.yml` |
| H2 | High | Build ที่ deploy ให้ผู้เล่นสร้างจาก dependency ที่ไม่ล็อก version | `.github/workflows/pages.yml`, `package.json` |
| H3 | Medium-High | โหลด save จาก localStorage โดยไม่ตรวจ shape → เกมพังถาวร + แก้ค่าได้อิสระ | `src/core/save/SaveManager.ts` |
| M1 | Medium | Pin GitHub Actions ด้วย tag ที่แก้ไขได้ (`@v4`) | ทั้งสอง workflow |
| M2 | Medium | PR จาก fork รัน `npm install` ของโค้ดที่ไม่น่าเชื่อถือ | `.github/workflows/ci.yml` |
| M3 | Medium | ไม่มี Content-Security-Policy | `index.html` |
| L1 | Low | เลขเศรษฐกิจในเกมไม่ตรวจชนิด/ไม่ clamp | `ProgressionSystem.ts` |
| L2 | Low | `try/catch` ใน entry point ไม่ครอบ error ที่เกิดใน scene | `src/main.ts` |
| L3 | Info | ไม่มี `SECURITY.md` / Dependabot / lockfile ให้ scan | repo |

**ไม่พบ:** XSS sink (`innerHTML`, `eval`, `new Function`, `document.write`) · secret ที่ commit ไว้ · `fetch`/`XMLHttpRequest`/`postMessage` · known CVE ใน dependency tree (audit 64 packages → 0 vulnerabilities)

---

## H1 — CI workflow ไม่จำกัดสิทธิ์ token และติดตั้ง dependency แบบไม่ล็อก

**ไฟล์:** `.github/workflows/ci.yml`

ปัญหา 4 อย่างที่ต่อกันเป็นสายโจมตีเดียว:

1. workflow ไม่มี block `permissions:` เลย → `GITHUB_TOKEN` ได้สิทธิ์ตาม default ของ repo ซึ่งอาจเป็น read/write ทั้งหมด (ต่างจาก `pages.yml` ที่ประกาศ least-privilege ไว้ถูกต้องแล้ว)
2. `actions/checkout@v4` ตั้ง `persist-credentials: true` เป็นค่าเริ่มต้น → token ถูกเขียนลง `.git/config` บน runner
3. `npm install` รัน lifecycle script (`preinstall`/`postinstall`) ของทุก package รวม transitive dependency
4. ไม่มี `package-lock.json` ใน repo → แต่ละครั้งที่รัน จะ resolve transitive dependency เป็น version ใหม่ล่าสุดเสมอ ไม่มี integrity hash ตรวจ

รวมกันแล้ว: ถ้ามี transitive dependency ตัวใดตัวหนึ่งถูก compromise (สถานการณ์ที่เกิดจริงเป็นระยะในระบบนิเวศ npm) โค้ดของผู้โจมตีจะรันบน runner ทันที อ่าน token จาก `.git/config` แล้ว push โค้ดเข้า repo ได้

**แนวทางแก้:**

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@v4
    with:
      persist-credentials: false
  ...
  - run: npm ci --ignore-scripts
```

พร้อม commit `package-lock.json` เข้า repo (ตรวจแล้วว่า dependency ปัจจุบัน — phaser, vite, typescript — ไม่ต้องใช้ install script จึงใช้ `--ignore-scripts` ได้)

## H2 — ไฟล์ที่ deploy ให้ผู้เล่นสร้างจาก dependency ที่ไม่ได้ล็อก

**ไฟล์:** `.github/workflows/pages.yml`, `package.json`

`pages.yml` ตั้ง `permissions` ไว้ดีแล้ว แต่ยังใช้ `npm install` ไม่มี lockfile เหมือนกัน ต่างกันตรงที่ผลลัพธ์ของ job นี้คือ bundle ที่ส่งถึงเบราว์เซอร์ผู้เล่นจริง

dependency ที่ถูก compromise จึงไม่ได้กระทบแค่ runner แต่ฝัง JavaScript อะไรก็ได้ลงในเกมที่ผู้เล่นโหลด (keylogger, redirect, cryptominer) โดยที่ diff ใน repo ไม่มีอะไรเปลี่ยนเลย — ตรวจจับยากมาก

`package.json` pin dependency ตรงไว้เป๊ะแล้ว (`"phaser": "4.2.1"` ไม่มี `^`) ซึ่งดี แต่ transitive dependency อีก ~60 ตัวยังลอยอยู่ ต้องใช้ lockfile เท่านั้นถึงจะปิดช่องนี้

**แนวทางแก้:** commit lockfile + เปลี่ยนเป็น `npm ci --ignore-scripts` เหมือน H1

## H3 — โหลด save โดยไม่ตรวจ shape

**ไฟล์:** `src/core/save/SaveManager.ts:11-18`

```ts
const parsed = JSON.parse(raw) as Partial<SaveData>;
if (parsed.saveVersion !== SAVE_VERSION) {
  return createDefaultSave();
}
return parsed as SaveData;   // ← cast ทั้งก้อนโดยไม่ตรวจอะไรอีก
```

`try/catch` ครอบไว้จับได้แค่ JSON ที่ parse ไม่ผ่าน ส่วนข้อมูลที่ parse ผ่านแต่ **รูปร่างผิด** จะถูก cast เป็น `SaveData` แล้วส่งต่อให้ทั้งเกมใช้ ทั้งที่ `as` เป็นแค่คำสั่งของ TypeScript ไม่มีการตรวจตอน runtime

ผลที่ยืนยันด้วยการจำลอง logic เดิม:

| ค่าใน localStorage | ผลลัพธ์ |
|---|---|
| `{"saveVersion":1}` | ผ่านการตรวจ → `TypeError: Cannot read properties of undefined (reading 'includes')` |
| field เป็น `null` | ผ่านการตรวจ → `TypeError: Cannot read properties of null (reading 'includes')` |
| `starsByDay: {"day-01":"x"}` | ผ่านการตรวจ ไปโผล่เป็นค่าเพี้ยนบนหน้าจอ |

จุดที่ระเบิดคือ `restaurantLevel()` และ `HomeScene.create()` ซึ่งเรียก `.includes()` บน field ที่สมมติว่าเป็น array เสมอ

**ผลกระทบสองด้าน:**

1. **เกมพังถาวรแบบกู้เองไม่ได้** — save ที่เขียนไม่ครบ (แท็บถูกปิดกลางคัน, quota เต็ม, ส่วนขยายเบราว์เซอร์) ทำให้ `HomeScene` throw ทุกครั้งที่เปิดเกม ไม่มีทางกลับสู่สถานะปกติถ้าไม่ล้าง localStorage เอง และเพราะ H3 ทำงานร่วมกับ L2 ผู้เล่นจะเห็นแค่จอว่าง ไม่มีข้อความบอกด้วยซ้ำ
2. **แก้ค่าได้อิสระ** — `coins`, `highestUnlockedDay`, `unlockedUpgrades` แก้จาก DevTools ได้หมด สำหรับเกม single-player offline ถือว่าความเสี่ยงต่ำ (ผู้เล่นโกงตัวเอง) **แต่จะกลายเป็นช่องโหว่จริงทันทีถ้าวันหนึ่งมี leaderboard หรือ cloud save** เพราะ client เป็นผู้ตัดสินคะแนนทั้งหมด

**หมายเหตุเรื่อง origin:** GitHub Pages แยก origin ตาม subdomain ของผู้ใช้ ไม่ใช่ตาม path ของ repo ดังนั้นทุกโปรเจกต์ที่ deploy ใต้ `<username>.github.io` แชร์ localStorage ก้อนเดียวกัน หน้าอื่นใต้ origin เดียวกันอ่าน/เขียน save ของเกมนี้ได้ — เป็นเหตุผลเพิ่มว่าทำไมต้องมองข้อมูลจาก localStorage เป็นข้อมูลที่ไม่น่าเชื่อถือ

**แนวทางแก้:** ตรวจ shape จริงตอนโหลด แล้ว fallback เป็น default save เมื่อไม่ผ่าน

```ts
function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.saveVersion === SAVE_VERSION
    && typeof v.highestUnlockedDay === 'number' && Number.isFinite(v.highestUnlockedDay)
    && typeof v.coins === 'number' && Number.isFinite(v.coins)
    && isStringArray(v.unlockedRecipes)
    && isStringArray(v.unlockedUpgrades)
    && isStringArray(v.achievements)
    && isStarMap(v.starsByDay);
}
```

พร้อม clamp ค่าตัวเลขให้อยู่ในช่วงที่เป็นไปได้ (`highestUnlockedDay` ไม่เกินจำนวนวันจริง, `coins >= 0`)

## M1 — Actions pin ด้วย tag ที่แก้ไขได้

ทั้งสอง workflow อ้าง action ด้วย `@v4` / `@v5` / `@v3` ซึ่งเป็น git tag ที่เจ้าของ repo ย้ายได้ตลอดเวลา ถ้าบัญชีผู้เผยแพร่ action ถูกยึด tag เดิมจะชี้ไปโค้ดใหม่ทันทีโดยไม่ต้องแก้อะไรฝั่งเรา

**แนวทางแก้:** pin เป็น commit SHA เต็ม พร้อม comment กำกับ version

```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

## M2 — PR จาก fork รัน `npm install` ของ package.json ที่แก้ไขมาแล้ว

`ci.yml` ทริกเกอร์ที่ `pull_request` → ใครก็ตามที่เปิด PR จาก fork สามารถใส่ `postinstall` script ใน `package.json` แล้วให้มันรันบน runner ได้

ความเสียหายจำกัดกว่า H1 เพราะ GitHub ให้ token แบบ read-only และไม่ส่ง secret ให้ PR จาก fork (ต่างจาก `pull_request_target` ซึ่ง repo นี้ไม่ได้ใช้ — ถูกต้องแล้ว) แต่ก็ยังเป็นการรันโค้ดแปลกปลอมโดยไม่ตั้งใจ

**แนวทางแก้:** `npm ci --ignore-scripts` ปิดช่องนี้ไปพร้อมกับ H1

## M3 — ไม่มี Content-Security-Policy

`index.html` ไม่ประกาศ CSP เลย ตอนนี้ความเสี่ยงต่ำเพราะเกมไม่ render อะไรจาก input ของผู้ใช้ (วาดผ่าน canvas ของ Phaser และใช้ `textContent` เท่านั้น) แต่ CSP คือด่านที่จะจำกัดความเสียหายถ้า H2 เกิดขึ้นจริง หรือถ้าอนาคตมีการรับข้อความจากผู้เล่น

GitHub Pages ตั้ง HTTP header เองไม่ได้ จึงต้องใช้ meta tag:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'">
```

(`'unsafe-inline'` สำหรับ style จำเป็นเพราะ `index.html` มี `<style>` inline อยู่ — ถ้าย้าย CSS ออกเป็นไฟล์จะตัดออกได้)

## L1 — เลขเศรษฐกิจไม่ตรวจชนิด/ไม่ clamp

**ไฟล์:** `src/systems/progression/ProgressionSystem.ts:47`

```ts
coins: current.coins + rewardCoins,
```

ถ้า `current.coins` เป็น string (ซึ่งเข้ามาได้เพราะ H3) ผลลัพธ์คือการต่อ string ไม่ใช่การบวก: `"0" + 45 === "045"` แล้วค่านั้นจะถูกเก็บกลับลง save และโตขึ้นเรื่อย ๆ ทุกกะ จนกระทบทั้ง `purchaseUpgrade` (`current.coins < upgrade.cost` เทียบ string) และการแสดงผล

แก้ H3 แล้วเคสนี้จะปิดไปเอง แต่การ clamp ที่ `completeShift` เป็นการป้องกันซ้อนชั้นที่คุ้มค่า

## L2 — `try/catch` ใน entry point ไม่ครอบ error ที่เกิดใน scene

**ไฟล์:** `src/main.ts:12-27`

`try/catch` ครอบแค่ `createGame()` ซึ่งเป็นการสร้าง `Phaser.Game` เท่านั้น ส่วน `create()` ของแต่ละ scene รันทีหลังใน game loop error จึงหลุดออกนอก catch เสมอ

ยิ่งกว่านั้น การเช็ค `document.querySelector('#game canvas')` จะเจอ canvas (Phaser สร้างไว้ก่อน scene รัน) → boot screen ถูกลบทิ้ง → ผู้เล่นเห็นจอเปล่า ไม่เห็นข้อความ error ที่เตรียมไว้เลย ทำให้ H3 กลายเป็นอาการ "เกมเปิดไม่ขึ้นแบบเงียบ ๆ"

**แนวทางแก้:** เพิ่ม `window.addEventListener('error', ...)` และ `'unhandledrejection'` ให้เรียก `showBootError` แล้วเสนอทางล้าง save ให้ผู้เล่นกู้เองได้

## L3 — งานเชิงกระบวนการ

- ไม่มี `package-lock.json` → เครื่องมือ scan (Dependabot, `npm audit`, CodeQL) ทำงานไม่ได้เลย ตอนตรวจครั้งนี้ต้องสร้าง lockfile ชั่วคราวเองก่อนถึงจะ audit ได้ (ผล: 64 packages, 0 vulnerabilities)
- ไม่มี `SECURITY.md` บอกช่องทางรายงานช่องโหว่
- ไม่ได้เปิด Dependabot / `dependency-review-action`
- `src/game/scenes/RestaurantScene.ts` ใช้ `any` หลายจุด (`box`, `state`, `timer`, `hud`) ทำให้ `strict: true` ที่ตั้งไว้ดีแล้วไม่ได้ช่วยตรงบริเวณนั้น — ไม่ใช่ช่องโหว่ แต่ลดชั้นป้องกัน

---

## สิ่งที่ทำไว้ดีอยู่แล้ว

- ไม่มี `innerHTML` / `eval` / `new Function` / `document.write` ที่ไหนเลย — วาดผ่าน canvas และ `textContent` ล้วน
- ไม่มี secret หรือ credential ที่ commit ไว้ · `.gitignore` กัน `.env` ครบ
- `package.json` pin dependency ตรงไม่มี range operator
- `pages.yml` ประกาศ `permissions` แบบ least-privilege พร้อม OIDC (`id-token: write`) ถูกต้องตามแนวทางของ GitHub
- ปิด sourcemap ใน production build
- ไม่มี network call ออกไปไหนเลย → ไม่มีความเสี่ยงข้อมูลรั่วหรือ third-party script
- `GameClock` clamp ค่า delta ไว้ที่ 250ms กัน spiral of death อยู่แล้ว

## ลำดับที่แนะนำให้ทำ

1. commit `package-lock.json` แล้วเปลี่ยนทั้งสอง workflow เป็น `npm ci --ignore-scripts` (ปิด H1, H2, M2 พร้อมกัน)
2. เพิ่ม `permissions: contents: read` และ `persist-credentials: false` ใน `ci.yml`
3. ตรวจ shape ของ save ใน `SaveManager.load()` (ปิด H3 และ L1)
4. pin action ด้วย SHA (M1)
5. เพิ่ม CSP meta tag (M3) และ global error handler (L2)
