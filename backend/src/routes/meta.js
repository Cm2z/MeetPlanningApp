
import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

async function safeQuery(sql, fallback = []) {
  try {
    const [rows] = await pool.execute(sql);
    return rows;
  } catch {
    return fallback;
  }
}

router.get('/', async (_req, res, next) => {
  try {
    const branches = await safeQuery('SELECT id, name, address FROM branches ORDER BY name');
    const equipment = await safeQuery('SELECT id, name, icon, total_quantity, status FROM equipment ORDER BY name');
    const settingsRows = await safeQuery('SELECT setting_key, setting_value FROM app_settings');
    const settings = Object.fromEntries(settingsRows.map((row) => [row.setting_key, row.setting_value]));
    res.json({ branches, equipment, settings });
  } catch (error) {
    next(error);
  }
});

export default router;
