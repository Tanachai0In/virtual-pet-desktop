# gpt-image Prompt Pack — สร้าง sprite ทั้งหมดด้วย ChatGPT

Prompt ทุกอันพร้อม copy-paste ลง ChatGPT (gpt-image) ได้ทันที ทำตามลำดับ:

1. Generate **Character Reference** ของ species ก่อน (ข้อ B) — เก็บภาพไว้แนบทุกครั้ง
2. Generate animation **ทีละแถว** (ข้อ C) — แม่นยำกว่าสั่งทั้ง sheet ใน 1 รูปมาก
3. Generate ของส่วนกลาง: บ้าน + items (ข้อ D)
4. Post-process ตาม checklist (ข้อ E) แล้ว `npm run sheets` ตรวจ

> **เคล็ดลับความ consistent:** ทำทุกแถวของ species เดียวใน chat session เดียว, แนบภาพ Character Reference ทุกครั้ง, ถ้า frame ไหนสัดส่วนเพี้ยนให้สั่ง regenerate เฉพาะแถวนั้นแทนที่จะยอมรับความเพี้ยน

---

## A. Shared Style Block (นำหน้า "ทุก" prompt)

```
Chibi kawaii 2D game sprite art, pastel colors, big round head about 50% of
total body height, huge sparkly eyes with white highlights, tiny body, soft
rounded shapes, thick clean outlines, flat cel shading with one soft shade
tone, cheerful and friendly, fully transparent background, no ground shadow,
no text, no watermark, no grid lines, no frame borders, consistent character
design in every frame.
```

---

## B. Character Reference (generate ก่อน ใช้อ้างอิงตลอด)

### B1. แมว — "Mochi"

```
[วาง Shared Style Block ตรงนี้]

A chibi kawaii cream-colored kitten named Mochi with peach-pink inner ears,
a small curled tail, blush cheeks, big sparkly amber eyes, a tiny pink nose,
and one darker cream patch over the left ear. Full body, standing, facing
right, 3/4 view. Single character only, centered, on a fully transparent
background. This exact design will be reused as the reference for a set of
animation sprite sheets — keep the design simple and highly repeatable.
```

### B2. หมา — "Toffee"

```
[วาง Shared Style Block ตรงนี้]

A chibi kawaii golden-cream puppy named Toffee with floppy caramel ears, a
short happy wagging tail, blush cheeks, big sparkly brown eyes, a small brown
nose, and a white chest patch. Full body, standing, facing right, 3/4 view.
Single character only, centered, on a fully transparent background. This
exact design will be reused as the reference for a set of animation sprite
sheets — keep the design simple and highly repeatable.
```

> เพิ่ม species ใหม่: copy โครง B1 แล้วเปลี่ยนคำบรรยายตัวละคร จากนั้นใช้ prompt ข้อ C ชุดเดิมได้เลย

---

## C. Animation Rows (ทีละแถว, ทุก species ใช้ชุดเดียวกัน)

**Template กลาง** — แทน `{FRAMES}`, `{TOTAL_WIDTH}` (= FRAMES×128), `{ANIMATION}` และแนบ/วางคำบรรยาย Character Reference:

```
[วาง Shared Style Block ตรงนี้]

Sprite sheet strip for a 2D game. EXACTLY {FRAMES} frames in ONE horizontal
row. Each frame is exactly 128x128 pixels; total image exactly
{TOTAL_WIDTH}x128 pixels. Equal spacing, no borders or gaps between frames.

The character: [วางคำบรรยายจาก Character Reference / แนบภาพ reference]

Animation: {ANIMATION}

Rules for every frame: the character faces RIGHT; feet planted on the same
baseline near the bottom of the frame (feet center at x=64, y=120 of each
128x128 cell); same character size, colors and proportions in every frame;
transparent background; no numbering, no labels, no grid lines.
```

### C1. idle — 6 frames (768×128)
`{ANIMATION}` =
```
a gentle idle loop: breathing softly (body rises and falls slightly), a slow
blink on frames 3-4, tail tip flicking; very subtle motion; frame 6 must
flow seamlessly back into frame 1
```

### C2. walk — 8 frames (1024×128)
```
a smooth walk cycle facing right: legs alternating, gentle head bob, tail
swaying; the 8 frames evenly sample one full stride so frame 8 loops
seamlessly back into frame 1
```

### C3. run — 6 frames (768×128)
```
an energetic run cycle facing right: body leaning forward, ears flapping,
all four paws off the ground in the middle of the cycle, big happy eyes;
loops seamlessly
```

### C4. sit — 6 frames (768×128)
```
frames 1-2: the character settles down into a cute sitting pose; frames 3-6:
sitting loop with tail sway and one blink; frame 6 flows back into frame 3
```

### C5. sleep — 4 frames (512×128)
```
curled up in a ball sleeping, eyes closed, slow breathing (body gently rises
and falls across the 4 frames); peaceful and cozy; loops seamlessly; no "zzz"
text or symbols
```

### C6. eat — 6 frames (768×128)
```
leaning its head down to munch food from the ground just below, cheeks
puffing as it chews, happy squinting eyes, small chewing motion across
frames; loops seamlessly
```

### C7. happy / petted — 6 frames (768×128)
```
being petted and delighted: eyes closed in joy (^ ^ shape), big smile, rosy
blush, slight cheerful bounce, a few small sparkles floating around the
head; loops seamlessly
```

### C8. pounce — 8 frames (1024×128)
```
a playful pounce, non-looping, in order: frames 1-2 crouching down wiggling,
frames 3-5 leaping forward through the air with front paws stretched out,
frames 6-7 landing softly, frame 8 proud finish with tail up and sparkly
eyes
```

### C9. (สำรอง) emote — 6 frames (768×128)
```
a happy excited jump on the spot: anticipation squash, jump up with ears
flying, land with a bounce; non-looping
```

---

## D. Common Assets

### D1. บ้านสัตว์เลี้ยง — 3 variants (768×256)

```
[วาง Shared Style Block ตรงนี้]

A chibi kawaii pet house for a 2D game: rounded doghouse shape with a pastel
pink roof, cream walls, a big arched doorway, a tiny heart sign under the
roof peak, and one small round window on the right side. THREE variants of
the SAME house side by side in one row, each variant exactly 256x256 pixels,
total image exactly 768x256 pixels: (1) doorway open and dark inside, (2)
doorway covered by a cute pastel curtain, (3) doorway covered and the round
window glowing warm yellow as if someone sleeps inside at night. Same house
design, size and position in all three variants. Transparent background, no
ground shadow, no text.
```

### D2. Items — 6 icons (384×64)

```
[วาง Shared Style Block ตรงนี้]

A single row of 6 cute game item icons for a 2D pet game, each icon exactly
64x64 pixels, total image exactly 384x64 pixels, evenly spaced, one icon per
cell, in this exact order left to right: (1) a red and white bouncy ball,
(2) a cute little blue fish, (3) a cartoon bone, (4) a pet food bowl filled
with kibble, (5) a heart-shaped cookie, (6) a pink sparkling heart.
Transparent background, no labels, no borders.
```

---

## E. Post-processing Checklist

gpt-image มักคืนภาพที่ **ขนาดไม่เป๊ะ** และ **พื้นหลังไม่โปร่งใสจริง** — แก้ตามนี้:

1. **ลบพื้นหลัง** (ถ้าไม่โปร่งใส):
   - ง่ายสุด: [rembg](https://github.com/danielgatis/rembg) — `rembg i in.png out.png`
   - หรือ Photopea (ฟรี, ในเบราว์เซอร์): Magic Wand เลือกพื้น → ลบ → Export PNG
   - หรือ ImageMagick: `magick in.png -fuzz 8% -transparent white out.png`
2. **Normalize ขนาดแต่ละแถว** ให้เป๊ะ `FRAMES×128 x 128`:
   ```bash
   magick row_walk.png -resize 1024x128! row_walk_fixed.png
   ```
   ถ้าระยะห่างระหว่าง frame เพี้ยน ให้ crop ทีละ frame แล้วต่อใหม่:
   ```bash
   magick row.png -crop 8x1@ +repage frame_%d.png
   magick frame_*.png -background none +append row_fixed.png
   ```
3. **ประกอบเป็น sheet เต็ม** (แถวเรียงตาม row order ใน contract, แถวที่ frame ไม่ครบ 8 ให้ pad ขวาด้วยความโปร่งใส):
   ```bash
   for f in row_*.png; do magick "$f" -background none -extent 1024x128 "$f"; done
   magick row_idle.png row_walk.png row_run.png row_sit.png row_sleep.png \
          row_eat.png row_happy.png row_pounce.png row_emote.png \
          -background none -append sheet.png
   ```
4. **วางไฟล์**: `assets/species/<name>/sheet.png` (ทับ placeholder ได้เลย)
5. **ตรวจ**: `npm run sheets` — ถ้า error เรื่อง frame โปร่งใส/ขนาด ให้กลับไปข้อ 2
6. **เช็คเท้าตรง baseline**: เปิดแอปดู ถ้าตัวลอย/จมพื้น ให้เลื่อนภาพใน frame หรือปรับ `anchor.y` ใน `meta.json` (120 = ค่ามาตรฐาน)
