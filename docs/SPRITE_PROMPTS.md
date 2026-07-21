# gpt-image Prompt Pack — สร้าง sprite ทั้งหมดด้วย ChatGPT (สเปคเฟรมสูง)

Prompt ทุกอันพร้อม copy-paste ลง ChatGPT (gpt-image) ได้ทันที สเปคนี้เป็นแบบ **high frame count** — idle 12 / walk 16 / run 12 / pounce 16 เฟรม เล่นที่ 12–24fps เพื่อ animation ที่ลื่นจริง ไม่ใช่กระตุกแบบ sprite เฟรมน้อย

**ภาพใน `assets/` ตอนนี้เป็นแค่ placeholder ที่สคริปต์วาดไว้ให้แอปรันได้** — ภาพจริงทั้งหมดให้ generate ตามเอกสารนี้แล้ววางทับ

## ทำไมต้อง generate เป็น grid 4×4 (ไม่ใช่ strip ยาว)

gpt-image ทำงานแม่นที่สุดที่ขนาด native **1024×1024** การขอ strip ยาว 2048×128 มักได้ขนาดเพี้ยนและตัวละครหลุดสเปค ดังนั้นทุก animation ให้ generate เป็น **ตาราง 4 คอลัมน์ × 4 แถว บนภาพ 1024×1024 (ช่องละ 256×256)** อ่านลำดับเฟรม **ซ้าย→ขวา แล้วขึ้นแถวใหม่ (แบบอ่านหนังสือ)** เสร็จแล้วค่อย slice + เรียงเป็นแถวตอน post-process (ข้อ E)

- animation 16 เฟรม → ใช้ครบทั้ง 16 ช่อง
- animation 12 เฟรม → ใช้ 3 แถวแรก (ช่อง 1–12), แถวล่างสุดปล่อยว่างโปร่งใส
- animation 8 เฟรม → ใช้ 2 แถวแรก

## ลำดับการทำ

1. Generate **Character Reference** ของ species (ข้อ B) — เก็บภาพไว้แนบทุก prompt ถัดไป
2. Generate animation **ทีละชุด** ตามข้อ C (ทำครบ 8 ชุดต่อ species)
3. Generate ของส่วนกลาง: บ้าน + items (ข้อ D)
4. Post-process ตามข้อ E แล้ว `npm run sheets` ตรวจ

> **เคล็ดลับความ consistent:** ทำทุกชุดของ species เดียวใน chat session เดียว, แนบภาพ Character Reference ทุกครั้ง, ถ้าชุดไหนสัดส่วน/สีเพี้ยนให้ regenerate ทั้งชุดนั้น อย่ายอมรับความเพี้ยนแล้วไปแก้ทีหลัง

---

## A. Shared Style Block (นำหน้า "ทุก" prompt)

```
Chibi kawaii 2D game sprite art, soft pastel colors, big round head about
50% of total body height, huge sparkly eyes with two white highlight dots,
tiny compact body, short stubby limbs, soft rounded shapes with no sharp
corners, thick clean dark-brown outlines of even weight, flat cel shading
with exactly one soft shadow tone per color, cheerful and friendly mood,
fully transparent background, no ground shadow, no text, no watermark, no
grid lines, no cell borders, identical character design in every frame.
```

## A2. Shared Grid Block (นำหน้า prompt ข้อ C ทุกอัน ต่อจาก Style Block)

```
Layout: one square image exactly 1024x1024 pixels, divided into an invisible
4x4 grid of 16 cells, each cell exactly 256x256 pixels. One animation frame
per cell. Frame order reads left-to-right, then top-to-bottom, like reading
a book. Inside every used cell: the character faces RIGHT, is horizontally
centered (body center at x=128 of the cell), and stands on the same ground
baseline — feet contact at y=230 of the cell. The character is about 200
pixels tall in its neutral standing pose and keeps the exact same scale,
colors, outline weight and proportions in every cell. Unused cells must stay
completely empty and transparent. Do not draw cell borders or numbers.
```

---

## B. Character Reference (generate ก่อน ใช้อ้างอิงตลอด)

### B1. แมว — "Mochi"

```
[Shared Style Block]

Character sheet of ONE chibi kawaii kitten named Mochi, to be used as the
master reference for animation frames. Design (keep it simple and highly
repeatable):
- cream / off-white fur, one darker warm-beige patch over the LEFT ear only
- big round head, peach-pink inner ears, tiny triangular ears
- huge sparkly amber eyes with two white highlight dots each
- tiny pink triangle nose, small "w" mouth, rosy blush circles on both cheeks
- small curled tail with a beige tip, stubby little paws
- no clothes, no accessories

Show the SAME character 3 times in one row on a transparent background:
(1) full body standing facing right in 3/4 view, (2) full body side profile
facing right, (3) face close-up. Consistent proportions across all three.
```

### B2. หมา — "Toffee"

```
[Shared Style Block]

Character sheet of ONE chibi kawaii puppy named Toffee, to be used as the
master reference for animation frames. Design (keep it simple and highly
repeatable):
- golden-cream fur with a white chest patch and white front paws
- big round head with long floppy caramel-brown ears that hang beside the face
- huge sparkly warm-brown eyes with two white highlight dots each
- small rounded brown nose, happy open smile with a tiny pink tongue tip,
  rosy blush circles on both cheeks
- short thick wagging tail, stubby little paws
- no clothes, no accessories

Show the SAME character 3 times in one row on a transparent background:
(1) full body standing facing right in 3/4 view, (2) full body side profile
facing right, (3) face close-up. Consistent proportions across all three.
```

> เพิ่ม species ใหม่: copy โครง B1/B2 เปลี่ยนเฉพาะรายละเอียดดีไซน์ แล้วใช้ prompt ข้อ C ชุดเดิมทั้งหมดได้เลย

---

## C. Animation Sets (ต่อ species — ทุก prompt แนบภาพ Character Reference เสมอ)

โครงทุก prompt:

```
[Shared Style Block]
[Shared Grid Block]

The character: [แนบภาพ reference + 1 บรรทัดสรุป เช่น "Mochi, the cream chibi
kitten with a beige patch over the left ear, exactly as in the attached
reference image"]

[วาง Animation Spec ของชุดนั้นจากด้านล่าง]
```

### C1. idle — 12 เฟรม @12fps (ใช้ 3 แถวแรกของ grid, แถว 4 ว่าง)

```
Animation spec: a calm 1-second idle breathing loop, 12 frames, subtle
motion only — the character stays planted in the same spot.
- Frames 1-6 (inhale): the chest and head rise smoothly by a total of about
  6 pixels, ears lift very slightly, tail curls up a touch.
- Frames 7-12 (exhale): everything settles smoothly back down so frame 12
  flows perfectly into frame 1.
- Blink: eyes fully open in all frames EXCEPT frames 8-9 — frame 8 eyes
  half closed, frame 9 eyes fully closed, frame 10 open again.
- Tail: gentle flick to the side peaking on frames 4-6.
- Frames 13-16: leave those 4 cells completely empty and transparent.
```

### C2. walk — 16 เฟรม @24fps (ใช้ครบ 16 ช่อง)

```
Animation spec: one complete smooth walk cycle facing right, 16 frames,
covering exactly TWO steps (right-side step then left-side step) so frame
16 flows perfectly back into frame 1. Use classic walk-cycle keys spread
evenly across the frames:
- Frame 1: CONTACT — right front paw planted forward, left back paw forward,
  body at middle height.
- Frames 2-3: DOWN — body squashes to its lowest point, head dips, ears
  press down slightly.
- Frames 4-5: PASSING — legs pass under the body, body rises through middle.
- Frames 6-7: UP — body at its highest, head bobs up, ears float up.
- Frame 8: approaching the opposite contact.
- Frames 9-16: mirror of frames 1-8 with the LEFT front paw leading.
The head bobs smoothly (about 4 pixels total), the tail sways opposite to
the head bob, and the blush and eye highlights stay identical in all frames.
Feet always return to the same baseline (y=230) on contact frames.
```

### C3. run — 12 เฟรม @24fps (ใช้ 3 แถวแรก, แถว 4 ว่าง)

```
Animation spec: one energetic bounding run cycle facing right, 12 frames,
looping perfectly (frame 12 flows into frame 1). The cycle has a real
airborne phase like a happy little gallop:
- Frames 1-3 (GATHER): body crouches and compresses, all paws bunch under
  the body, ears swing back, tail low.
- Frames 4-6 (LAUNCH): body extends and leaves the ground, front paws
  reaching forward, back legs pushed back, body fully stretched, leaning
  forward about 15 degrees.
- Frames 7-9 (AIRBORNE PEAK): all four paws off the ground at the top of
  the arc (about 12 pixels above baseline), ears flying up, tail streaming
  behind, big happy open-mouth smile.
- Frames 10-12 (LAND & ABSORB): front paws touch down first, body squashes
  to absorb, ready to flow back into the gather of frame 1.
- Frames 13-16: leave completely empty and transparent.
```

### C4. sit — 12 เฟรม @12fps (แอปเล่น 1-4 ครั้งเดียว แล้ววนเฉพาะ 5-12)

```
Animation spec: sitting down then a seated idle loop, 12 frames.
- Frames 1-4 (TRANSITION, played once): from standing, the back end lowers
  smoothly into a cute upright sitting pose — frame 1 standing with back
  legs starting to fold, frame 2 haunches halfway down, frame 3 haunches
  touching the ground with front legs straight, frame 4 fully settled
  sitting pose, tail wrapping around to the front.
- Frames 5-12 (SEATED LOOP): stays seated; chest rises and falls gently
  (breathing), the tail tip taps slowly against the ground, head tilts a
  tiny bit side to side; eyes blink on frames 9-10 (9 half closed, 10
  closed); frame 12 flows perfectly back into frame 5.
- Frames 13-16: leave completely empty and transparent.
```

### C5. sleep — 8 เฟรม @8fps (ใช้ 2 แถวแรก, แถว 3-4 ว่าง)

```
Animation spec: curled-up sleeping loop, 8 frames, very slow and cozy.
The character lies curled in a ball on the ground, tail wrapped around the
body, head tucked so the cheek rests on the tail, eyes closed as two soft
curved lines, tiny content smile.
- Frames 1-4 (INHALE): the whole curled body inflates smoothly by about 5
  pixels, ears rise a hair.
- Frames 5-8 (EXHALE): deflates smoothly back; frame 8 flows perfectly
  into frame 1.
- Frame 6 only: one ear gives a tiny involuntary twitch.
- No "zzz" text or symbols (the game adds those).
- Frames 9-16: leave completely empty and transparent.
```

### C6. eat — 12 เฟรม @16fps (ใช้ 3 แถวแรก, แถว 4 ว่าง)

```
Animation spec: eating loop, 12 frames. The character eats food placed on
the ground just in front of its front paws (do NOT draw the food itself —
the game draws it separately).
- Frames 1-3 (LEAN DOWN): head dips smoothly toward the ground in front,
  ears falling forward, haunches slightly raised.
- Frames 4-9 (CHEW, two rounds): head stays low and bobs in small munching
  motions; cheeks visibly puff out alternately — left cheek puffed on
  frames 4-5, both cheeks full on 6, right cheek puffed on 7-8, both full
  on 9; eyes squeezed happy (^ ^) while chewing.
- Frames 10-12 (SWALLOW & LIFT): head lifts back up, a happy gulp, tiny
  sparkle in the eyes, licking its lips with a small pink tongue on frame
  12; flows back into frame 1 for the next bite.
- Frames 13-16: leave completely empty and transparent.
```

### C7. happy / ถูกลูบหัว — 12 เฟรม @16fps (ใช้ 3 แถวแรก, แถว 4 ว่าง)

```
Animation spec: overjoyed being-petted loop, 12 frames. Throughout ALL
frames: eyes closed in delight as two happy arcs (^ ^), big open smile,
extra-large rosy blush, two or three tiny sparkles floating near the head
(sparkles only — no hearts, the game adds hearts).
- Frames 1-3 (SQUASH): joyful anticipation, body compresses down, cheeks
  puffed.
- Frames 4-6 (STRETCH UP): bounces upward off the ground about 10 pixels,
  ears flying up, front paws lifted happily.
- Frames 7-9 (LAND & JIGGLE): lands softly, body wobbles left then right
  like jelly.
- Frames 10-12 (WIGGLE): little side-to-side tail-wagging shimmy settling
  back to center; frame 12 flows perfectly into frame 1.
- Frames 13-16: leave completely empty and transparent.
```

### C8. pounce — 16 เฟรม @24fps (ใช้ครบ 16 ช่อง, เล่นครั้งเดียวไม่วน)

```
Animation spec: a playful hunting pounce facing right, 16 frames,
NON-looping (frame 16 is a hold pose). Full sequence:
- Frames 1-4 (STALK & WIGGLE): body lowers into a crouch, chin near the
  ground, eyes wide and locked forward, rear end raised and wiggling side
  to side (left on 2, right on 3, left on 4), tail twitching.
- Frames 5-8 (LAUNCH): explodes forward and upward — body fully stretched
  in a rising arc, front paws reaching far forward with spread toe beans,
  back legs extended behind, ears pinned back by the wind.
- Frames 9-11 (PEAK & DESCEND): at the top of the arc about 20 pixels above
  baseline, body starts tilting nose-down, front paws out ready to catch.
- Frames 12-13 (LAND & ABSORB): front paws slam down on the baseline, body
  squashes deep, ears flop forward over the face.
- Frames 14-16 (PROUD FINISH): straightens up into a proud chest-out pose,
  tail high and curled, sparkly satisfied eyes, tiny smug smile — frame 16
  is a clean hold pose.
```

### C9. (สำรอง) emote jump — 12 เฟรม @16fps (ใช้ 3 แถวแรก, แถว 4 ว่าง)

```
Animation spec: an excited surprise jump, 12 frames, NON-looping.
- Frames 1-3 (STARTLE SQUASH): eyes go wide and round, ears shoot straight
  up, body compresses into a deep squash.
- Frames 4-8 (LEAP): springs straight up about 25 pixels, full body
  stretch, ears and tail flying, paws splayed, delighted open mouth.
- Frames 9-12 (LAND & SPARKLE): lands with a soft squash, straightens up,
  happy closed-eye smile with two tiny sparkles beside the head; frame 12
  is a clean hold pose.
- Frames 13-16: leave completely empty and transparent.
```

---

## D. Common Assets

### D1. บ้านสัตว์เลี้ยง — 3 variants (แถวเดียว 1536×512 แล้วย่อเป็น 768×256)

```
[Shared Style Block]

A chibi kawaii pet house for a 2D game, drawn THREE times side by side in
one row: one image exactly 1536x512 pixels, each variant centered in its
own 512x512 cell, all three variants IDENTICAL in design, size and position
— only the doorway and window state changes.

House design: rounded cozy doghouse shape; pastel pink scalloped roof with
a round chimney knob on top; warm cream walls; a big arched doorway in the
center-front; a tiny pink heart sign hanging under the roof peak; one small
round porthole window with a pale wooden frame on the right wall; a thin
pastel welcome mat in front of the door.

- Variant 1 (OPEN): doorway open showing soft dark warm shadow inside,
  window plain glass with a subtle sky-blue tint.
- Variant 2 (CLOSED): doorway covered by a cute pastel striped curtain
  hanging in a gentle drape, window plain glass.
- Variant 3 (SLEEPING): doorway covered by the same curtain, and the round
  window glowing soft warm yellow from inside, with two tiny light rays,
  as if someone sleeps inside at night.

Transparent background, no ground shadow, no text, no cell borders.
```

### D2. Items — 6 icons (แถวเดียว 1536×256 แล้วย่อเป็น 384×64)

```
[Shared Style Block]

A single row of 6 cute game item icons for a 2D pet game: one image exactly
1536x256 pixels, each icon centered in its own 256x256 cell with about 20%
padding, same outline weight and pastel palette across all six, in this
exact order left to right:
1. a bouncy ball — cherry-red bottom half, cream top half, a tiny yellow
   star on the side, one white shine dot
2. a cute little fish — round sky-blue body, paler belly, single dot eye,
   fan tail
3. a cartoon bone — classic double-knob bone in warm ivory with soft shading
4. a pet food bowl — coral-pink rounded bowl filled with brown kibble
   pellets, one pellet resting on the rim
5. a heart-shaped cookie — golden-brown with a lighter icing heart outline
   and three chocolate-chip dots
6. a sparkling heart — glossy pink heart with one big white highlight and
   two tiny four-point sparkles beside it

Transparent background, no labels, no borders, no numbers.
```

### D3. (ทางเลือก) Tray / App Icon

```
[Shared Style Block]

A single app icon, exactly 512x512 pixels: the face of a cream chibi kitten
(same design language as Mochi — peach-pink inner ears, huge sparkly amber
eyes, tiny pink nose, rosy blush) smiling warmly, centered, big and readable
even at 16x16 pixels. Transparent background, no border, no text.
```

วางทับ `assets/icons/app-512.png`, ย่อเป็น 256 (`app-256.png`) และ 32 (`tray-32.png`) ด้วย `magick app-512.png -resize NxN out.png`

---

## E. Post-processing: จาก grid 4×4 → sheet จริง

gpt-image มักคืนภาพขนาดไม่เป๊ะและพื้นหลังไม่โปร่งใสจริง ทำตามนี้ทีละชุด:

1. **บังคับขนาดภาพ grid ให้เป๊ะ 1024×1024** (ถ้าเพี้ยน):
   ```bash
   magick grid_walk.png -resize 1024x1024! grid_walk.png
   ```
2. **ลบพื้นหลัง** (ถ้าไม่โปร่งใส):
   - ง่ายสุด: [rembg](https://github.com/danielgatis/rembg) — `rembg i grid_walk.png grid_walk.png`
   - หรือ Photopea (ฟรี, ในเบราว์เซอร์): Magic Wand ที่พื้น → ลบ → Export PNG
   - หรือ ImageMagick: `magick grid_walk.png -fuzz 8% -transparent white grid_walk.png`
3. **Slice grid เป็นเฟรม แล้วเรียงเป็นแถวเดียว** (เฟรม 256 → ย่อเหลือ 128):
   ```bash
   magick grid_walk.png -crop 4x4@ +repage -resize 128x128 f_%02d.png
   magick f_*.png -background none +append row_walk.png     # 16 เฟรม → 2048x128
   rm f_*.png
   ```
   ชุดที่ไม่ครบ 16 เฟรม ให้ต่อเฉพาะเฟรมที่ใช้ แล้ว pad ขวาให้กว้าง 2048:
   ```bash
   magick f_00.png ... f_11.png -background none +append row_run.png   # 12 เฟรม
   magick row_run.png -background none -gravity West -extent 2048x128 row_run.png
   ```
4. **ประกอบ 9 แถวเป็น sheet** (เรียงตาม row order ใน `SPRITE_CONTRACT.md`; ถ้าไม่ได้ทำแถวสำรอง C9 ให้สร้างแถวโปร่งใสแทน: `magick -size 2048x128 canvas:none row_emote.png`):
   ```bash
   magick row_idle.png row_walk.png row_run.png row_sit.png row_sleep.png \
          row_eat.png row_happy.png row_pounce.png row_emote.png \
          -background none -append sheet.png                 # 2048x1152
   ```
5. **วางไฟล์**: ทับ `assets/species/<name>/sheet.png` ได้เลย
6. **ตรวจ**: `npm run sheets` — error เรื่องเฟรมโปร่งใส/ขนาด ให้กลับไปข้อ 1-3
7. **เช็คเท้าตรง baseline**: เปิดแอปดู ถ้าตัวลอย/จมพื้น/สไลด์ ให้เลื่อนภาพในเฟรมที่เพี้ยน หรือปรับ `anchor.y` ใน `meta.json` (ค่ามาตรฐาน 120)

### บ้านและ items

```bash
magick house.png  -resize 768x256!  assets/species/common/house.png
magick items.png  -resize 384x64!   assets/species/common/items.png
```
