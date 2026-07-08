import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

const coreTables = ['users', 'rooms', 'bookings', 'notifications'];
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

async function tableExists(name) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [name]
  );
  return Number(rows[0].total) > 0;
}

async function hasCoreTables() {
  for (const table of coreTables) {
    if (!(await tableExists(table))) return false;
  }
  return true;
}

function isIgnorableMigrationError(error) {
  return safeDuplicateErrorCodes.has(error.code) || safeDuplicateErrnos.has(error.errno);
}

async function runSqlFile(name, required = false) {
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
      await pool.query(statement);
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

async function main() {
  if (!(await hasCoreTables())) {
    await runSqlFile('schema.sql', true);
  } else {
    console.log('core tables already exist; skip schema.sql');
  }

  for (const file of upgradeFiles) {
    await runSqlFile(file);
  }

  console.log('Migration completed');
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
