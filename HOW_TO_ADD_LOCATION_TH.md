# วิธีเพิ่มสถานที่ / ห้องประชุม

วิธีที่ง่ายที่สุดตอนนี้คือเพิ่มผ่านฐานข้อมูลโดยตรง แล้วรีเฟรชเว็บ

## เพิ่มสาขา / อาคาร

เปิด phpMyAdmin หรือ MySQL แล้วรันตัวอย่างนี้:

```sql
INSERT INTO branches (name, address)
VALUES ('สาขาขอนแก่น', 'อาคารสำนักงานขอนแก่น');
```

## เพิ่มห้องประชุม

ดูเลข id ของสาขาก่อน:

```sql
SELECT id, name FROM branches;
```

จากนั้นเพิ่มห้อง:

```sql
INSERT INTO rooms
  (branch_id, code, name, building, floor, capacity, status, image_url)
VALUES
  (1, 'ROOM-A01', 'ห้องประชุม A', 'อาคาร A', 'ชั้น 2', 12, 'available',
   'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80');
```

## เพิ่มอุปกรณ์ให้ห้อง

ดูเลข id ของห้องและอุปกรณ์:

```sql
SELECT id, name FROM rooms;
SELECT id, name FROM equipment;
```

ผูกอุปกรณ์เข้าห้อง:

```sql
INSERT INTO room_equipment (room_id, equipment_id)
VALUES (1, 1), (1, 3);
```

## สถานะห้องที่ใช้ได้

- `available` = พร้อมใช้งาน
- `maintenance` = ปิดซ่อม
- `disabled` = ปิดใช้งาน

หลังเพิ่มข้อมูลแล้ว ให้กดรีเฟรชหน้าเว็บ หรือออกเข้าใหม่หนึ่งครั้ง
