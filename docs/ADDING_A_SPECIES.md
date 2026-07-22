# เพิ่มสัตว์เลี้ยงตัวใหม่

เพิ่ม species = วางโฟลเดอร์เดียว ไม่ต้องแก้โค้ด

1. สร้างโฟลเดอร์ `assets/species/<ชื่อ>/` (a-z, 0-9, `-`, `_`)
2. Copy `meta.json` จาก `assets/species/cat/` มาแก้:
   - `name` ให้ตรงชื่อโฟลเดอร์, `displayName` ตามใจ
   - `speeds` ปรับความเร็วเดิน/วิ่ง (px/วินาที)
   - `headBox` โซนลูบหัว (พิกัดใน frame 128×128)
3. สร้าง `sheet.png` ตาม `docs/SPRITE_CONTRACT.md` — ใช้ prompt จาก `docs/SPRITE_PROMPTS.md` (แค่เปลี่ยน Character Reference เป็นตัวใหม่)
4. Stabilize + ตรวจ: `npm run stabilize && npm run sheets`
5. รีสตาร์ทแอป → species ใหม่โผล่ในเมนู tray "Choose pet" อัตโนมัติ

ยังไม่มีภาพจริง? รัน `npm run placeholders` ไม่ได้ช่วย species ใหม่ (generator รู้จักแค่ cat/dog) — ก็อป `sheet.png` ของ cat มาวางชั่วคราวก่อนได้
