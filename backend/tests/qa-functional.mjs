import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
dotenv.config();
const source = process.env.DB_NAME || process.env.MYSQLDATABASE || 'meetplanning';
const db = 'mp_qa_' + Date.now();
const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
if (!['localhost','127.0.0.1','::1'].includes(host)) throw Error('Local database required');
const setup = await mysql.createConnection({host, port:Number(process.env.DB_PORT||process.env.MYSQLPORT||3306),user:process.env.DB_USER||process.env.MYSQLUSER||'root',password:process.env.DB_PASSWORD||process.env.MYSQLPASSWORD||''});
const ident = s => '`'+s.replaceAll('`','``')+'`';
const results=[]; let server, pool;
try {
  await setup.query('CREATE DATABASE '+ident(db)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const [tables]=await setup.query('SHOW FULL TABLES FROM '+ident(source)+" WHERE Table_type = 'BASE TABLE'");
  for(const row of tables) {const name=Object.values(row)[0];await setup.query('CREATE TABLE '+ident(db)+'.'+ident(name)+' LIKE '+ident(source)+'.'+ident(name));}
  process.env.DB_NAME=db; process.env.MYSQLDATABASE=db;
  process.env.NODE_ENV='test';process.env.JWT_SECRET=randomUUID()+randomUUID();
  process.env.ALLOW_DATABASE_RESTORE='false';
  ({pool}=await import('../src/config/db.js'));
  const password=randomUUID(); const hash=await bcrypt.hash(password,10);
  for(const role of ['user','staff','admin']) await pool.execute('INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,?,?)',['QA '+role,role+'@qa.example.com',hash,role,'active']);
  await pool.query("INSERT INTO branches(id,name) VALUES(1,'QA branch')");
  await pool.query("INSERT INTO rooms(id,branch_id,name,building,floor,capacity,status) VALUES(1,1,'QA Room A','QA','1',20,'available'),(2,1,'QA Room B','QA','1',20,'available')");
  await pool.query('INSERT INTO '+ident(db)+'.booking_rules SELECT * FROM '+ident(source)+'.booking_rules');
  const app=express();app.use(express.json());
  const {registerRoutes}=await import('../src/routes/index.js');registerRoutes(app);
  app.use((e,req,res,next)=>res.status(500).json({message:e.message}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;const sessions={};
  async function call(role,path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(sessions[role]?{Cookie:sessions[role]}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  function record(name,input,expected,r,ok,detail=''){results.push({name,input,expected,status:ok?'ผ่าน':'ไม่ผ่าน',http:r.status,actual:detail||r.data.message||JSON.stringify(r.data)});console.log((ok?'PASS ':'FAIL ')+name);}
  for(const role of ['user','staff','admin']){const r=await call(null,'/api/auth/login','POST',{email:role+'@qa.example.com',password});sessions[role]=r.cookie;record('เข้าสู่ระบบ '+role,'บัญชีทดสอบ '+role,'HTTP 200 และบทบาทถูกต้อง',r,r.status===200&&r.data.user?.role===role,'บทบาท '+r.data.user?.role);}
  let r=await call('user','/api/rooms?q=QA%20Room%20A');record('ค้นหาห้อง','QA Room A','พบห้อง A พร้อมข้อมูล',r,r.status===200&&r.data.length===1&&r.data[0].name==='QA Room A');
  const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
  const booking=(room=1,start='09:00:00',end='10:00:00',title='QA reservation')=>({roomId:room,title,attendeeCount:2,startAt:date+'T'+start,endAt:date+'T'+end});
  r=await call('user','/api/bookings','POST',booking());const id=r.data.id;
  record('จองเวลาว่าง',date+' ห้อง A 09:00-10:00','HTTP 201 และ pending',r,r.status===201&&r.data.booking?.status==='pending');
  if(!id) throw Error('Initial booking failed');
  const roomSearch = (day, start, end) => '/api/rooms?' + new URLSearchParams({ date: day, start, end });
  r = await call('user', '/api/rooms');
  record('ห้องยังอยู่หลังจอง', 'รายการห้องโดยไม่กรองเวลา', 'ยังพบห้อง A', r, r.status === 200 && r.data.some(room => room.id === 1));
  r = await call('user', roomSearch(date, '09:30', '10:30'));
  record('ตรวจเวลาทับซ้อนใน popup', 'ห้อง A มีจอง 09:00–10:00', 'ห้อง A ไม่ว่าง 09:30–10:30', r, r.status === 200 && !r.data.some(room => room.id === 1));
  r = await call('user', roomSearch(date, '10:00', '11:00'));
  record('เวลาอื่นวันเดียวกันยังว่าง', 'ห้อง A 10:00–11:00', 'ห้อง A ยังจองได้', r, r.status === 200 && r.data.some(room => room.id === 1));
  const nextDay = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  r = await call('user', roomSearch(nextDay, '09:00', '10:00'));
  record('เวลาเดิมคนละวันยังว่าง', 'ห้อง A วันถัดไป 09:00–10:00', 'ห้อง A ยังจองได้', r, r.status === 200 && r.data.some(room => room.id === 1));
  for(const [name,start,end] of [['เวลาซ้ำทั้งหมด','09:00:00','10:00:00'],['ทับซ้อนบางส่วน','09:30:00','10:30:00']]){r=await call('user','/api/bookings','POST',booking(1,start,end));const [[c]]=await pool.query('SELECT COUNT(*) n FROM bookings');record(name,date+' ห้อง A '+start+'-'+end,'HTTP 409 และไม่มีรายการเพิ่ม',r,r.status===409&&Number(c.n)===1);}
  r=await call('user','/api/bookings','POST',booking(2));const otherId=r.data.id;record('คนละห้องเวลาเดียวกัน','ห้อง B 09:00-10:00','HTTP 201',r,r.status===201);
  r=await call('user','/api/bookings','POST',booking(1,'10:00:00','11:00:00'));record('ช่วงเวลาติดกัน','ห้อง A 10:00-11:00','HTTP 201',r,r.status===201);
  r=await call('user','/api/bookings/'+id+'/status','PATCH',{status:'approved'});const [[unchanged]]=await pool.query('SELECT status FROM bookings WHERE id=?',[id]);record('User สั่งอนุมัติโดยตรง','User เรียก API อนุมัติ','HTTP 403 และยัง pending',r,r.status===403&&unchanged.status==='pending');
  r=await call('staff','/api/admin/users');record('Staff เข้าจัดการบัญชีผู้ใช้','Staff เรียก API รายชื่อผู้ใช้','HTTP 403',r,r.status===403);
  r=await call('admin','/api/admin/users');record('Admin เข้าจัดการบัญชีผู้ใช้','Admin เรียก API รายชื่อผู้ใช้','HTTP 200',r,r.status===200);
  for(const [role,bid,status] of [['staff',id,'approved'],['admin',otherId,'rejected']]){r=await call(role,'/api/bookings/'+bid+'/status','PATCH',{status});const [[b]]=await pool.query('SELECT status FROM bookings WHERE id=?',[bid]);record(role+' เปลี่ยนสถานะเป็น '+status,'รายการ '+bid,'HTTP 200 และฐานข้อมูลเป็น '+status,r,r.status===200&&b.status===status);}
  r=await call('user','/api/bookings?mine=true');record('ผู้จองเห็นสถานะ','ประวัติของ User','รายการแรก approved และรายการที่สอง rejected',r,r.status===200&&r.data.some(x=>x.id===id&&x.status==='approved')&&r.data.some(x=>x.id===otherId&&x.status==='rejected'));
  r=await call('user','/api/notifications');record('แจ้งเตือนผลพิจารณา','User เปิดการแจ้งเตือน','มีแจ้งอนุมัติและปฏิเสธ',r,r.status===200&&r.data.data?.some(x=>x.title.includes('อนุมัติ'))&&r.data.data?.some(x=>x.title.includes('ปฏิเสธ')));
  // Regression probe: rejected bookings must not be re-approved over another reservation.
  r=await call('user','/api/bookings','POST',booking(2));const replacement=r.data.id;
  if(replacement){r=await call('admin','/api/bookings/'+otherId+'/status','PATCH',{status:'approved'});const [[c]]=await pool.query("SELECT COUNT(*) n FROM bookings WHERE room_id=2 AND status IN ('pending','approved','checked_in')");record('อนุมัติรายการเก่าหลังมีผู้จองแทน','ห้อง B: ปฏิเสธเดิม → จองใหม่ → อนุมัติเดิม','ปฏิเสธคำสั่งเพื่อไม่ให้เกิดเวลาซ้ำ',r,r.status>=400&&Number(c.n)===1,'HTTP '+r.status+'; จำนวนรายการกันเวลาซ้ำกัน = '+c.n);}
  r=await call('admin','/api/bookings/2147483647/status','PATCH',{status:'approved'});
  record('อนุมัติรายการที่ไม่มีอยู่','รหัส 2147483647','HTTP 404',r,r.status===404);
  r=await call('admin','/api/bookings/'+otherId+'/status','PATCH',{status:'pending'});
  record('เปิดรายการปฏิเสธกลับเป็นรออนุมัติ','rejected → pending','HTTP 409',r,r.status===409);
  const [legacy]=await pool.execute("INSERT INTO bookings(room_id,user_id,title,attendee_count,start_at,end_at,status) VALUES(1,1,'QA legacy overlap',2,?,?,'pending')",[date+' 09:30:00',date+' 10:30:00']);
  r=await call('admin','/api/bookings/'+legacy.insertId+'/status','PATCH',{status:'approved'});
  const [[legacyState]]=await pool.query('SELECT status FROM bookings WHERE id=?',[legacy.insertId]);
  record('ตรวจเวลาซ้ำของข้อมูลเก่าก่อนอนุมัติ','pending เก่าทับซ้อนรายการ approved','HTTP 409 และยัง pending',r,r.status===409&&legacyState.status==='pending');
  r=await call('user','/api/bookings','POST',booking(2,'13:00:00','14:00:00'));
  if(r.data.id){const bid=r.data.id;const parallel=await Promise.all([call('admin','/api/bookings/'+bid+'/status','PATCH',{status:'approved'}),call('staff','/api/bookings/'+bid+'/status','PATCH',{status:'approved'})]);record('อนุมัติรายการเดียวกันพร้อมกัน','Admin และ Staff ส่งพร้อมกัน','สำเร็จครั้งเดียว อีกคำขอ HTTP 409',parallel[0],parallel.map(x=>x.status).sort().join(',')==='200,409','HTTP '+parallel.map(x=>x.status).join(', '));}
  const promotedEmail='promoted-'+Date.now()+'@qa.example.com';
  r=await call(null,'/api/auth/register','POST',{name:'QA promoted staff',email:promotedEmail,password,department:'QA'});
  sessions.promoted=r.cookie;
  const promotedId=r.data.user?.id;
  r=await call('admin','/api/admin/users/'+promotedId,'PATCH',{role:'staff'});
  const beforeRefresh=await call('promoted','/api/bookings');
  const refreshed=await call('promoted','/api/auth/session');
  sessions.promoted=refreshed.cookie;
  const afterRefresh=await call('promoted','/api/bookings');
  record('Staff เห็นรายการจองทั้งหมดหลังได้รับสิทธิ์','เลื่อน User เป็น Staff ระหว่างที่ยังมี session','หลังตรวจ session ต้องเห็นรายการเดียวกับ Admin',afterRefresh,
    r.status===200 && beforeRefresh.status===200 && beforeRefresh.data.length===0 && refreshed.status===200 && refreshed.data.user?.role==='staff' && afterRefresh.status===200 && afterRefresh.data.length>0,
    'ก่อนรีเฟรชเห็น '+beforeRefresh.data.length+' รายการ หลังรีเฟรชเห็น '+afterRefresh.data.length+' รายการ');
  for (const role of ['user', 'staff', 'admin']) {
    const backup = await fetch(base + '/api/backup/download', { headers: { Cookie: sessions[role] } });
    const sql = await backup.text();
    const ok = role === 'admin'
      ? backup.status === 200 && backup.headers.get('content-disposition')?.includes('meetplanning-backup.sql') && sql.includes('CREATE TABLE') && sql.includes('Browser') === false && sql.includes('QA reservation')
      : backup.status === 403;
    record('สิทธิ์ดาวน์โหลด Backup ' + role, role + ' กดดาวน์โหลด', role === 'admin' ? 'HTTP 200 พร้อมไฟล์ SQL' : 'HTTP 403', { status: backup.status, data: {} }, ok, 'HTTP ' + backup.status);
  }
  const restore = await call('admin', '/api/backup/restore', 'POST', { sql: 'SELECT 1;' });
  record('Restore ปิดตามค่าเริ่มต้น', 'Admin ส่ง SQL ขณะปิด Restore', 'HTTP 403', restore, restore.status === 403);
} finally {
  try {
  await mkdir(new URL('../../output/qa/', import.meta.url),{recursive:true});
  await writeFile(new URL('../../output/qa/functional-results.json', import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),environment:'Local API and isolated database; table structures cloned using CREATE TABLE LIKE (foreign keys not copied); current source routes; no browser UI test',results},null,2));
  const clean=s=>String(s).replaceAll('|','/').replaceAll('\n',' ');
  await writeFile(new URL('../../output/qa/functional-results.md', import.meta.url),'# ผลทดสอบ MeetPlanning\n\nทดสอบ API จริงกับฐานข้อมูลแยกในเครื่อง โดยคัดลอกโครงสร้างตารางด้วย CREATE TABLE LIKE (ไม่คัดลอก Foreign Key) ใช้ข้อมูลจำลองและกฎการจองปัจจุบัน ไม่ใช่การทดสอบหน้าเว็บหรือระบบ Railway\n\n| รายการทดสอบ | ข้อมูลที่ใช้ทดสอบ | ผลที่คาดหวัง | ผลการทดสอบ |\n|---|---|---|---|\n'+results.map(x=>'| '+[x.name,x.input,x.expected,x.status+' — HTTP '+x.http+'; '+x.actual].map(clean).join(' | ')+' |').join('\n'));
  } finally {
  if(server) await new Promise(r=>server.close(r));if(pool) await pool.end();
  // Only remove the unique database created by this invocation.
  if(/^mp_qa_\d+$/.test(db)&&db!==source) await setup.query('DROP DATABASE '+ident(db));
  await setup.end();
  }
}
if (results.some(result => result.status !== 'ผ่าน')) process.exitCode = 1;
