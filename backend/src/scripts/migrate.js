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

function findSqlFile(name) {
  const candidates = [
    path.join(backendRoot, 'database', name),
    path.join(projectRoot, 'database', name)
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function cleanRailwayUnsafeSql(sql) {
  return sql
    .replace(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\`\w-]+\s*;?/gi, '')
    .replace(/USE\s+[\`\w-]+\s*;?/gi, '');
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
  await pool.query(sql);
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
