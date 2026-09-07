# โครงสร้าง MeetPlanning

## Frontend

- `src/App.vue`, `src/main.js`: ประกอบหน้าจอและเริ่มต้น Vue
- `src/views/auth/`: เข้าสู่ระบบ
- `src/views/dashboard/`: หน้าหลักและสถิติ
- `src/views/bookings/`: ค้นหา จอง ประวัติ และหน้าการจองเพิ่มเติม
- `src/views/account/`: โปรไฟล์และการแจ้งเตือน
- `src/views/administration/`: จัดการห้อง ผู้ใช้ ตั้งค่า และสำรองข้อมูล
- `src/components/`: ส่วนหน้าจอที่ใช้ร่วมกัน
- `src/composables/`: state และ action ของแอป
- `src/services/`: ตัวเรียก API และบริการ dialog
- `src/constants/`: ค่าคงที่
- `src/styles/main.css`: สไตล์รวม เรียงกฎตามเดิมเพื่อรักษาหน้าตา
- `archive/`: สำเนาหน้าจอเก่า ไม่ใช้ในแอป

## Backend

- `src/app.js`: ตั้งค่า Express, middleware และ routes
- `src/server.js`: เชื่อมฐานข้อมูล เริ่ม worker และเปิดพอร์ต
- `src/routes/`: API แยกตามงาน และ index.js สำหรับลงทะเบียน
- `src/middleware/`: ตรวจสอบผู้ใช้และสิทธิ์
- `src/services/`: แจ้งเตือน อีเมล วงจรการจอง และย้ายรหัสผ่าน
- `src/config/`: การเชื่อมต่อฐานข้อมูล
- `src/scripts/`: migration
- `tests/`: ทดสอบ HTTP และ functional API

## คู่มือและเครื่องมือ

- `docs/`: คู่มือโครงสร้าง เพิ่มสถานที่ deploy และคำสั่ง Git
- `scripts/documents/`: สคริปต์ Python สำหรับงานเอกสาร รันจากรากโปรเจกต์ เช่น `python scripts/documents/inspect_doc.py` โดยใช้ไฟล์ต้นฉบับและ dependencies ตามที่สคริปต์ระบุ
- `scripts/release/`: batch เดิมสำหรับ build/commit/push ซึ่งกลับไปทำงานที่รากโปรเจกต์โดยอัตโนมัติ สคริปต์เหล่านี้มีคำสั่ง push จริง
- `document_work/`, `work/`, `output/`, `tmp/`, `qa_*`, `rendered*`: ข้อมูลและผลลัพธ์งานเอกสารเดิม เก็บตำแหน่งไว้เพราะเครื่องมือเดิมอ้างอิงอยู่ ไม่ใช่ source ของเว็บ

## ฐานข้อมูล

`database/` ใช้สำหรับ import เองและ Docker Compose ส่วน `backend/database/` เป็นชุด SQL ที่ใช้เมื่อ deploy เฉพาะ backend ตัว migration ค้นหาใน backend ก่อนแล้วจึงค้นหาที่รากโปรเจกต์ จึงเก็บทั้งสองตำแหน่งตามเดิม

## เริ่มใช้งานและตรวจสอบ

คำสั่งเดิมยังใช้ได้: รัน `npm run dev` ใน frontend และ backend หรือ `npm start` ใน backend

จากรากโปรเจกต์:

```bash
npm --prefix frontend run build
npm --prefix backend test
npm --prefix backend run test:functional
```

การทดสอบ functional ต้องใช้ MySQL ในเครื่องพร้อม schema เดิม และสิทธิ์สร้างฐานข้อมูลทดสอบ สคริปต์สร้างฐานข้อมูลชั่วคราวชื่อ `mp_qa_*` และลบเฉพาะฐานข้อมูลนั้นเมื่อจบ ผลทดสอบอยู่ใน `output/qa/` การทดสอบนี้ไม่ใช่การทดสอบหน้าเว็บหรือระบบ deploy

เพิ่มหน้าจอใหม่ในหมวดของ `views/` และ import ใน `App.vue` เพิ่ม API ใน `routes/` แล้วลงทะเบียนที่ `routes/index.js` เก็บสำเนาเก่าไว้นอก `src/` และเก็บเครื่องมือไว้ใน `scripts/`

## ตรวจความพร้อมก่อนอัป Git

รัน `pwsh -File scripts/maintenance/verify-release.ps1` จากรากโปรเจกต์ สคริปต์หยุดทันทีเมื่อขั้นตอนใดไม่ผ่าน และไม่ commit/push ให้อัตโนมัติ ต้องมี dependencies และฐานข้อมูลทดสอบในเครื่องตามรายละเอียดด้านบน

ตรวจช่องโหว่ด้วย `npm --prefix frontend audit` และ `npm --prefix backend audit` เมื่อเข้าถึง npm registry ได้ Backend override `qs` เป็น `6.16.0` เพื่อแก้ช่องโหว่ของช่วงเวอร์ชันที่ Express 4 เลือก และใช้ mysql2 รุ่นแก้ไขที่บันทึกใน lockfile

สำหรับการย้ายโครงสร้างครั้งนี้ ต้องรวมทั้งไฟล์ใหม่และการลบตำแหน่งเก่าใน commit เดียวกัน อย่าใช้ batch release เก่าที่ stage เฉพาะรายการไฟล์ของงานครั้งก่อน ตรวจ `git diff --cached --stat` ก่อน commit เสมอ

`output/`, `tmp/`, `work/`, `document_work/` และผล render/QA ถูก ignore เพื่อไม่ให้ข้อมูลเอกสารและไฟล์ชั่วคราวปนในชุดอัปโหลด
