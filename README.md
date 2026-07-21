# 🐱 Virtual Pet Desktop

สัตว์เลี้ยงจิ๋วสไตล์ chibi kawaii ที่ใช้ชีวิตอยู่บนแถบล่างของจอ (เหนือ taskbar) — เดินเล่น นอนกลางแดด วิ่งไล่บอล และรอให้คุณลูบหัว เป็นมิตรกว่า Desktop Goose เยอะ: **ไม่วิ่งไปทั่วจอ ไม่ขโมยเมาส์** อยู่แค่แถบล่างเท่านั้น และคลิกทะลุได้ทุกจุดที่ไม่ใช่ตัวสัตว์

- 🎮 2D canvas เดียว, จำกัด 30fps, หลับแล้วหยุดวาดสนิท → กิน CPU น้อยมาก
- 🏠 มีบ้านส่วนตัว — ง่วงเมื่อไหร่เดินกลับไปนอนเอง (ไฟหน้าต่างติดด้วยนะ)
- 🖐️ ลูบหัว (ถูเมาส์บนหัว) → หัวใจลอย, ให้อาหารจาก tray, ปาบอลให้ไล่งับ
- 🐶 มีแมว (Mochi) และหมา (Toffee) — เพิ่ม species ใหม่ได้แค่วางโฟลเดอร์ sprite
- 💾 ค่าหิว/ความสุข/พลังงาน persist ข้ามการเปิดปิด (เวลาเดินต่อแม้ปิดแอป)
- 🖼️ มาพร้อม placeholder sprite ใช้ได้ทันที + prompt pack สำหรับ generate ภาพจริงด้วย ChatGPT (gpt-image) ใน [`docs/SPRITE_PROMPTS.md`](docs/SPRITE_PROMPTS.md)

รองรับ Windows / macOS / Linux (Electron)

## ติดตั้ง

ต้องมี [Node.js ≥ 20](https://nodejs.org) และ git

### ทางลัด (git bash / terminal)

```bash
# macOS / Linux / Git Bash
curl -fsSL https://raw.githubusercontent.com/Tanachai0In/virtual-pet-desktop/main/install.sh | bash
```

```powershell
# Windows PowerShell
iwr -useb https://raw.githubusercontent.com/Tanachai0In/virtual-pet-desktop/main/install.ps1 | iex
```

### ติดตั้งเอง

```bash
git clone https://github.com/Tanachai0In/virtual-pet-desktop.git
cd virtual-pet-desktop
npm install
npm start
```

### สร้าง installer (.exe / .dmg / .AppImage)

```bash
npm run dist    # ผลลัพธ์อยู่ใน release/
```

## วิธีเล่น

| ทำอะไร | ยังไง |
|--------|-------|
| ลูบหัว | ถูเมาส์เบาๆ บนหัว หรือคลิกที่ตัว |
| ให้อาหาร | tray icon → Feed → เลือกเมนู (อาหารตกใกล้ตำแหน่งเมาส์) |
| เล่นบอล | tray → Play ball แล้วดูมันไล่งับ — ลากบอลแล้วปาเองก็ได้ |
| เรียกกลับบ้าน | คลิกที่บ้าน หรือ tray → Send home |
| ปลุก | คลิกที่บ้านตอนไฟติด หรือ tray → Wake up |
| เปลี่ยนตัว | tray → Choose pet |
| ดูค่าสถานะ | เอาเมาส์ hover บนตัว |

## เปลี่ยนเป็นภาพสวยจริง (AI-generated)

ภาพที่ติดมาเป็น placeholder ที่ generate จากสคริปต์ — อยากได้ chibi สวยๆ:

1. เปิด [`docs/SPRITE_PROMPTS.md`](docs/SPRITE_PROMPTS.md) → copy prompt ไปให้ ChatGPT (gpt-image) generate ทีละแถว
2. Post-process ตาม checklist ในไฟล์เดียวกัน (ลบพื้นหลัง, ประกอบ sheet)
3. วางทับ `assets/species/<ชื่อ>/sheet.png` → `npm run sheets` ตรวจ → รีสตาร์ทแอป

สเปคของ sheet อยู่ใน [`docs/SPRITE_CONTRACT.md`](docs/SPRITE_CONTRACT.md), เพิ่มสัตว์ตัวใหม่ดู [`docs/ADDING_A_SPECIES.md`](docs/ADDING_A_SPECIES.md)

## Development

```bash
npm start             # รันแอป
npm test              # unit tests (FSM, needs, ball physics, animator, sheets)
npm run lint          # eslint + type check (JSDoc + tsc)
npm run sheets        # validate sprite sheets
npm run placeholders  # regenerate placeholder art (ทับของเดิม)
```

โครงสร้าง: `src/main/` (Electron main — window docking, click-through, tray, save), `src/renderer/` (canvas engine + game logic), `scripts/` (asset tooling), checklist ทดสอบมือใน [`docs/QA.md`](docs/QA.md)

## License

MIT
