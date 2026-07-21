# Sprite Sheet Contract

ทุก species ใช้สเปคเดียวกัน — เพิ่มสัตว์ตัวใหม่ = วางโฟลเดอร์ `assets/species/<name>/` ที่มี `sheet.png` + `meta.json` แล้วแอปจะเห็นเองโดยไม่ต้องแก้โค้ด (ดู `docs/ADDING_A_SPECIES.md`)

## sheet.png (ต่อ species)

- PNG-32 **มี alpha channel** (พื้นหลังโปร่งใสจริง ไม่ใช่สีขาว)
- ขนาด frame คงที่ **128×128 px** — เรนเดอร์จริงที่ scale 0.75 (≈96px)
- **1 animation ต่อ 1 แถว**, frame เรียงซ้าย→ขวา, ช่องที่ไม่ใช้ปล่อยโปร่งใส
- Grid มาตรฐาน **16 คอลัมน์ × 9 แถว = 2048×1152 px** (สเปคเฟรมสูง — animation ลื่นที่ 12–24fps)
- ตัวละคร**หันขวาเสมอ** (หันซ้ายแอป mirror ให้ตอนรัน)
- **Anchor เท้า**: กึ่งกลางเท้าอยู่ที่ pixel (64, 120) ของทุก frame — ยืนบน baseline เดียวกันทุก frame

| Row | Animation | Frames | FPS | Loop |
|-----|-----------|--------|-----|------|
| 0 | idle (หายใจ กระพริบตา หางแกว่ง) | 12 | 12 | ✓ |
| 1 | walk (วงจรเดินเต็ม 2 ก้าว) | 16 | 24 | ✓ |
| 2 | run (วงจรวิ่งมีช่วงลอยตัว) | 12 | 24 | ✓ |
| 3 | sit (นั่งลง 4 frame แรก แล้ววนที่เหลือ) | 12 | 12 | ✓ (loopFrom: 4) |
| 4 | sleep (ขดตัวหลับ หายใจช้า) | 8 | 8 | ✓ |
| 5 | eat (ก้มกิน เคี้ยว 2 รอบ) | 12 | 16 | ✓ |
| 6 | happy / ถูกลูบหัว (เด้งดีใจ) | 12 | 16 | ✓ |
| 7 | pounce (ย่อ→พุ่ง→ลง→ท่าจบ) | 16 | 24 | ✗ |
| 8 | สำรอง (emote เพิ่มเติม) | 12 | 16 | ✗ |

## meta.json (ต่อ species)

```json
{
  "name": "cat",
  "displayName": "Mochi the Cat",
  "frame": { "w": 128, "h": 128 },
  "anchor": { "x": 64, "y": 120 },
  "renderScale": 0.75,
  "speeds": { "walk": 60, "run": 160 },
  "headBox": { "x": 34, "y": 12, "w": 60, "h": 52 },
  "animations": {
    "idle":   { "row": 0, "frames": 12, "fps": 12, "loop": true },
    "walk":   { "row": 1, "frames": 16, "fps": 24, "loop": true },
    "run":    { "row": 2, "frames": 12, "fps": 24, "loop": true },
    "sit":    { "row": 3, "frames": 12, "fps": 12, "loop": true, "loopFrom": 4 },
    "sleep":  { "row": 4, "frames": 8,  "fps": 8,  "loop": true },
    "eat":    { "row": 5, "frames": 12, "fps": 16, "loop": true },
    "happy":  { "row": 6, "frames": 12, "fps": 16, "loop": true },
    "pounce": { "row": 7, "frames": 16, "fps": 24, "loop": false }
  }
}
```

- `headBox` = โซนลูบหัว (พิกัดใน frame 128×128, แอปแปลง scale/mirror ให้เอง)
- `loopFrom` = เล่น 0..N ครั้งแรกจบแล้ววนเฉพาะ frame ตั้งแต่ index นี้
- animation ชื่อ `idle` ต้องมีเสมอ (ใช้เป็น fallback)

## Common sheet (`assets/species/common/`)

- **house.png** — 3 variant เรียงแถวเดียว frame ละ 256×256 (รวม 768×256): `open` (ประตูเปิด), `closed` (ม่านปิด), `sleeping` (ประตูปิด หน้าต่างไฟติด)
- **items.png** — 1 แถว 6 ช่อง ช่องละ 64×64 (รวม 384×64) ตามลำดับ: ball, fish, bone, bowl, cookie, heart
- ตำแหน่ง cell กำหนดใน `common/meta.json`

## การตรวจสอบ

```bash
npm run sheets       # validate ทุก sheet เทียบกับ meta.json
```

ตัว validator ตรวจ: ขนาดภาพหาร frame ลงตัว, มี alpha channel, ทุก frame ที่ประกาศไว้มี pixel จริง (ไม่โปร่งใสล้วน), cell เกิน frame count ควรโปร่งใส (แจ้งเป็น warning)
