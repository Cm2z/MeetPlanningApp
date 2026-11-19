import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

const migrationLockName = 'meetplanning:migrate';
const upgradeFiles = [
  'upgrade_enterprise.sql',
  'upgrade_pro_features.sql',
  'upgrade_production_pack.sql',
  'fix_backend_required_tables.sql',
  'fix_notification_role_visibility.sql'
];

const safeDuplicateErrorCodes = new Set([
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_FK_DUP_NAME',
  'ER_DUP_ENTRY',
  'ER_CANT_DROP_FIELD_OR_KEY'
]);

const safeDuplicateErrnos = new Set([1060, 1061, 1062, 1091, 1826]);

function findSqlFile(name) {
  const candidates = [
    path.join(backendRoot, 'database', name),
    path.join(projectRoot, 'database', name)
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function cleanRailwayUnsafeSql(sql) {
  return sql
    .replace(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\`\w-]+(?:\s+[^;]*)?;/gi, '')
    .replace(/USE\s+[\`\w-]+\s*;?/gi, '')
    .replace(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/gi, 'ADD COLUMN')
    .replace(/ADD\s+INDEX\s+IF\s+NOT\s+EXISTS/gi, 'ADD INDEX')
    .replace(/ADD\s+KEY\s+IF\s+NOT\s+EXISTS/gi, 'ADD KEY');
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (!quote && char === '-' && next === '-') {
      while (index < sql.length && sql[index] !== '\n') index += 1;
      current += '\n';
      continue;
    }

    if (!quote && char === '#') {
      while (index < sql.length && sql[index] !== '\n') index += 1;
      current += '\n';
      continue;
    }

    if (!quote && char === '/' && next === '*') {
      index += 2;
      while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
      index += 1;
      continue;
    }

    if ((char === "'" || char === '"' || char === '`') && sql[index - 1] !== '\\') {
      if (quote === char) quote = null;
      else if (!quote) quote = char;
    }

    if (char === ';' && !quote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

async function hasAnyTables(connection) {
  const [rows] = await connection.execute(
    'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  return Number(rows[0].total) > 0;
}

function isIgnorableMigrationError(error) {
  return safeDuplicateErrorCodes.has(error.code) || safeDuplicateErrnos.has(error.errno);
}

async function runSqlFile(connection, name, required = false) {
  const file = findSqlFile(name);
  if (!file) {
    const message = 'missing SQL file: ' + name;
    if (required) throw new Error(message);
    console.log('skip missing', name);
    return;
  }

  let sql = fs.readFileSync(file, 'utf8');
  sql = cleanRailwayUnsafeSql(sql).trim();
  if (!sql) {
    console.log('skip empty', name);
    return;
  }

  console.log('running', path.relative(process.cwd(), file).replace(/\\/g, '/'));
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      if (isIgnorableMigrationError(error)) {
        console.log('skip already applied:', error.code || error.errno);
        continue;
      }
      error.sql = statement;
      throw error;
    }
  }
}

async function seedRealisticBookings(connection) {
  if (process.env.DEMO_SEED_BOOKINGS !== 'true') return;

  const [[seeded]] = await connection.execute(
    "SELECT id FROM users WHERE email = 'demo.booking01@example.com' LIMIT 1"
  );
  if (seeded) {
    console.log('Demo booking data already exists; skipping seed');
    return;
  }

  const [[admin]] = await connection.execute(
    "SELECT id FROM users WHERE email = 'admin@meetplanning.local' LIMIT 1"
  );
  const [[sampleUser]] = await connection.execute(
    "SELECT id FROM users WHERE email = 'user@meetplanning.local' LIMIT 1"
  );
  const [rooms] = await connection.execute(
    "SELECT id, capacity FROM rooms WHERE id IN (1, 2, 3) AND status = 'available' ORDER BY id"
  );
  if (!admin || !sampleUser || rooms.length !== 3) {
    throw new Error('Demo booking seed requires the initial admin, sample user, and three available rooms');
  }

  const demoUsers = [
    ['กิตติพงษ์ ศรีสุข', 'demo.booking01@example.com', 'ฝ่ายขาย'],
    ['พิมพ์ชนก วัฒนกุล', 'demo.booking02@example.com', 'การตลาด'],
    ['ธนกร พิพัฒน์', 'demo.booking03@example.com', 'เทคโนโลยีสารสนเทศ'],
    ['ชนิกานต์ ตั้งใจ', 'demo.booking04@example.com', 'ทรัพยากรบุคคล'],
    ['วรพล นาคทอง', 'demo.booking05@example.com', 'ปฏิบัติการ'],
    ['ณัฐธิดา ชัยวัฒน์', 'demo.booking06@example.com', 'การเงิน']
  ];
  const roomSlots = ['09:00:00', '11:00:00', '14:00:00'];
  const statusCycle = ['approved', 'pending', 'approved', 'approved', 'pending', 'approved', 'rejected', 'approved', 'pending'];
  const titles = [
    'ประชุมวางแผนประจำสัปดาห์', 'ติดตามความคืบหน้าโครงการ', 'รีวิวแผนการตลาด',
    'ประชุมทีมลูกค้า', 'อบรมระบบการทำงาน', 'ประชุมฝ่ายปฏิบัติการ',
    'สัมภาษณ์ผู้สมัคร', 'วางแผนแคมเปญไตรมาสถัดไป', 'สรุปงานประจำเดือน',
    'ทบทวนงบประมาณ', 'ประชุมเริ่มต้นโครงการ', 'ประชุมประสานงานข้ามฝ่าย'
  ];
  const purposes = [
    'สรุปงานค้างและจัดลำดับความสำคัญของสัปดาห์',
    'ติดตามกำหนดส่งงานและหารือประเด็นที่ต้องตัดสินใจ',
    'ทบทวนผลลัพธ์และกำหนดแผนดำเนินงานรอบถัดไป',
    'เตรียมข้อมูลนำเสนอและประสานงานกับทีมที่เกี่ยวข้อง',
    'อบรมการใช้งานระบบให้พนักงานในแผนก',
    'วางแผนกำลังคนและขั้นตอนการปฏิบัติงาน'
  ];
  const notes = [
    'เตรียมเอกสารสรุปก่อนเริ่มประชุม',
    'ขอใช้จอแสดงผลสำหรับนำเสนอ',
    'มีผู้เข้าร่วมจากต่างสาขาผ่านวิดีโอคอล',
    'ขอจัดห้องเป็นรูปแบบประชุมกลุ่มย่อย',
    'ผู้เข้าร่วมทยอยเข้าห้องก่อนเวลา 10 นาที',
    ''
  ];

  const todayParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const todayValues = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
  const todayUtc = Date.UTC(Number(todayValues.year), Number(todayValues.month) - 1, Number(todayValues.day));
  const requesterIds = [Number(sampleUser.id)];

  await connection.beginTransaction();
  try {
    for (const [name, email, department] of demoUsers) {
      const [[existing]] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing) {
        requesterIds.push(Number(existing.id));
        continue;
      }
      const randomPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      const [inserted] = await connection.execute(
        'INSERT INTO users (name, email, password_hash, role, status, department) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, randomPasswordHash, 'user', 'active', department]
      );
      requesterIds.push(Number(inserted.insertId));
    }

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    for (let index = 0; index < 36; index += 1) {
      const dayOffset = 2 + Math.floor(index / 3);
      const roomIndex = index % 3;
      const room = rooms[roomIndex];
      const date = new Date(todayUtc + dayOffset * 86400000).toISOString().slice(0, 10);
      const startTime = roomSlots[roomIndex];
      const [startHour, startMinute, startSecond] = startTime.split(':').map(Number);
      const endHour = startHour + 1;
      const endTime = [endHour, startMinute, startSecond].map((value) => String(value).padStart(2, '0')).join(':');
      const status = statusCycle[index % statusCycle.length];
      const attendeeOptions = [6, 8, 10, 18, 24, 36, 48, 10, 16];
      const attendeeCount = Math.min(Number(room.capacity), attendeeOptions[index % attendeeOptions.length]);
      const createdAt = new Date(Date.now() - ((index % 12) + 1) * 86400000);
      const approvedAt = status === 'approved' ? new Date(createdAt.getTime() + 3600000) : null;
      const title = titles[index % titles.length];
      const purpose = purposes[index % purposes.length];
      const note = notes[index % notes.length];
      await connection.execute(
        'INSERT INTO bookings (room_id, user_id, title, purpose, attendee_count, start_at, end_at, requester_phone, note, status, approved_by, approved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          Number(room.id),
          requesterIds[(index * 3 + Math.floor(index / 4)) % requesterIds.length],
          title,
          purpose,
          attendeeCount,
          date + ' ' + startTime,
          date + ' ' + endTime,
          '',
          note,
          status,
          status === 'approved' ? Number(admin.id) : null,
          approvedAt,
          createdAt
        ]
      );
      if (status === 'approved') approvedCount += 1;
      else if (status === 'pending') pendingCount += 1;
      else rejectedCount += 1;
    }

    await connection.commit();
    console.log('Created 36 realistic demo bookings:', approvedCount, 'approved,', pendingCount, 'pending,', rejectedCount, 'rejected');
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const connection = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 180) AS acquired', [migrationLockName]);
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error('Could not acquire the database migration lock');
    }
    lockAcquired = true;

    if (!(await hasAnyTables(connection))) {
      await runSqlFile(connection, 'schema.sql', true);
    } else {
      console.log('database already contains tables; skip destructive schema.sql');
    }

    for (const file of upgradeFiles) {
      await runSqlFile(connection, file);
    }

    await seedRealisticBookings(connection);
    console.log('Migration completed');
  } finally {
    if (lockAcquired) {
      try {
        await connection.execute('SELECT RELEASE_LOCK(?)', [migrationLockName]);
      } catch (error) {
        console.error('Could not release the database migration lock:', error.message);
      }
    }
    connection.release();
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
