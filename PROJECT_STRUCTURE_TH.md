
# โครงสร้างไฟล์ MeetPlanning หลังจัดระเบียบ

## Frontend

โฟลเดอร์หลัก:

- frontend/src/App.vue: ประกอบ layout และเลือก view ที่จะแสดง
- frontend/src/api.js: ตัวเรียก API กลาง
- frontend/src/composables/useMeetPlanning.js: state และ action หลักของระบบ
- frontend/src/constants/status.js: mapping สถานะการจอง
- frontend/src/components/: component ที่ใช้ซ้ำ เช่น sidebar, topbar, toast
- frontend/src/views/: หน้าแต่ละเมนู เช่น dashboard, reserve, recurring, waitlist, settings
- frontend/src/style.css: style รวมของแอป

## Backend

โฟลเดอร์หลัก:

- backend/src/server.js: ตั้งค่า Express และเรียก register routes
- backend/src/routes/index.js: รวม route ทั้งหมดไว้จุดเดียว
- backend/src/routes/: route แยกตาม domain
- backend/src/config/db.js: การเชื่อมต่อ MySQL
- backend/src/middleware/auth.js: middleware login/role
- backend/src/utils/: helper เช่น activity, mailer
- backend/src/scripts/: script เช่น migrate

## Database

- database/schema.sql: schema เริ่มต้น
- database/upgrade_*.sql: migration เพิ่มฟีเจอร์ต่าง ๆ
- database/fix_*.sql: SQL ซ่อมตาราง/คอลัมน์ที่จำเป็น

## หมายเหตุ

หลัง refactor แล้ว App.vue จะไม่กอง logic ทั้งหมดในไฟล์เดียวอีกต่อไป
ถ้าจะเพิ่มหน้าใหม่ ให้สร้างไฟล์ใน frontend/src/views แล้ว import ใน App.vue
ถ้าจะเพิ่ม API ใหม่ ให้สร้าง route ใน backend/src/routes แล้ว register ใน backend/src/routes/index.js
