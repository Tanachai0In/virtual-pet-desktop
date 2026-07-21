# Manual QA Checklist

## Window / docking
- [ ] แถบ pet อยู่เหนือ taskbar พอดี (Windows taskbar ล่าง), ลอง taskbar ด้านข้าง/บน → แถบยังอยู่ขอบล่างของพื้นที่ทำงาน
- [ ] macOS: อยู่เหนือ Dock, ตามไปทุก Space, ไม่ทับแอป fullscreen
- [ ] Linux (GNOME/KDE): อยู่เหนือ panel; ถ้าไม่มี compositor แถบอาจไม่โปร่งใส (ทราบแล้ว)
- [ ] เปลี่ยน resolution / ถอดจอ / ย้าย taskbar → แถบ re-dock เองภายใน ~1 วินาที
- [ ] แถบไม่โผล่ใน taskbar/Alt-Tab

## Click-through
- [ ] คลิกบริเวณว่างของแถบ → ทะลุไปหน้าต่าง/desktop ข้างหลัง
- [ ] คลิก/hover บนตัว pet, บ้าน, อาหาร, บอล → โต้ตอบได้ (ไม่ทะลุ)
- [ ] Linux: ขยับเมาส์ผ่านตัว pet → กลายเป็น interactive ภายใน ~0.2s (poll 10Hz)

## Pet behaviors
- [ ] idle: กระพริบตา, สุ่มสลับ เดิน/นั่ง
- [ ] เดินแล้วหันซ้าย-ขวาถูกทิศ (sprite mirror)
- [ ] ลูบหัว (ถูเมาส์บนหัว หรือคลิกตัว) → อนิเมชัน happy + หัวใจลอย + happiness ขึ้น (hover ดู bubble)
- [ ] ให้อาหารจาก tray → อาหารตกใกล้เมาส์, pet เดิน/วิ่งไปกินจนหมด, hunger ลด
- [ ] Play ball จาก tray → บอลเด้งไปตามแถบ, pet วิ่งไล่, pounce แล้วเขี่ยบอล, เลิกเล่นเองหลังผ่านไปสักพัก
- [ ] ลากบอลแล้วปาได้, บอลชนขอบจอสะท้อนกลับ
- [ ] energy ต่ำ → เดินกลับบ้าน, บ้านเปลี่ยนเป็นไฟติด, pet หายเข้าบ้าน
- [ ] คลิกบ้านตอน pet หลับ → ตื่นออกมา; คลิกบ้านตอน pet อยู่นอกบ้าน → ถูกเรียกกลับบ้าน

## Persistence
- [ ] ปิดแอป → เปิดใหม่ → ชื่อ/ค่า hunger/happiness/energy/species เดิม (มี offline decay ตามเวลาที่ปิด สูงสุด 8 ชม.)
- [ ] เปิดแอปซ้ำ instance ที่สอง → ไม่เปิดซ้ำ, ตัวแรกยังอยู่

## Resource usage
- [ ] Task Manager / Activity Monitor: CPU < ~2% ตอน pet เดินเล่น (30fps tier)
- [ ] pet หลับในบ้าน → CPU ~0% (loop หยุดสนิท)
- [ ] เปิดทิ้งไว้ 1 ชม. → RAM ไม่โตขึ้นเรื่อยๆ

## Tray
- [ ] เมนูครบ: Feed (3 ชนิด), Play ball, Send home, Wake up, Choose pet (radio ตรง species ปัจจุบัน), Launch at startup, Show/Hide, Quit
- [ ] Quit จาก tray → state ถูก save (เปิดใหม่ค่าเดิม)
