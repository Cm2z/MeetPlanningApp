import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
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

async function applyInitialAccounts(connection) {
  const raw = String(process.env.INITIAL_ACCOUNTS_JSON || '');
  if (!raw) return;

  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts)) throw new Error('INITIAL_ACCOUNTS_JSON must be an array');
  for (const account of accounts) {
    const email = String(account.email || '').trim().toLowerCase();
    const password = String(account.password || '');
    const role = String(account.role || '');
    if (!email || password.length < 6 || !['admin', 'user'].includes(role)) {
      throw new Error('Invalid initial account configuration');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      'INSERT INTO users (name, email, password_hash, role, department, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role), department = VALUES(department), status = VALUES(status)',
      [account.name || (role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'), email, passwordHash, role, account.department || '', 'active']
    );
    console.log('Initial account configured:', email);
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

    await applyInitialAccounts(connection);
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
