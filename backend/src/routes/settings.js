
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();
const ALLOWED_SETTINGS = new Set([
  'org_name', 'primary_color', 'admin_email', 'smtp_host', 'smtp_port',
  'smtp_user', 'smtp_password', 'smtp_from',
]);

function validateSetting(key, value) {
  const text = String(value ?? '').trim();
  if (text.length > 500) return `${key} ยาวเกินกำหนด`;
  if (key === 'primary_color' && !/^#[0-9a-fA-F]{6}$/.test(text)) return 'รูปแบบสีไม่ถูกต้อง';
  if (key === 'smtp_port' && (!/^\d{1,5}$/.test(text) || Number(text) > 65535)) return 'SMTP port ไม่ถูกต้อง';
  if (['admin_email', 'smtp_from'].includes(key) && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `${key} ไม่ใช่อีเมลที่ถูกต้อง`;
  return '';
}

router.get('/public', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ("org_name","primary_color")');
    res.json(Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])));
  } catch (error) { next(error); }
});

router.get('/', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings ORDER BY setting_key');
    const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
    settings.smtp_password_configured = Boolean(settings.smtp_password);
    settings.smtp_password = '';
    res.json(settings);
  } catch (error) { next(error); }
});

router.patch('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const entries = Object.entries(req.body).filter(([key]) => ALLOWED_SETTINGS.has(key));
    if (!entries.length) return res.status(422).json({ message: 'ไม่พบการตั้งค่าที่อนุญาต' });
    for (const [key, value] of entries) {
      if (key === 'smtp_password' && !String(value || '')) continue;
      const validationMessage = validateSetting(key, value);
      if (validationMessage) return res.status(422).json({ message: validationMessage });
      await pool.execute('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [key, String(value ?? '')]);
    }
    await audit(req.user.id, 'update_settings', 'settings', null, entries.map(([key]) => key));
    res.json({ message: 'Settings updated' });
  } catch (error) { next(error); }
});

router.post('/test-email', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const to = String(req.body.to || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(422).json({ message: 'อีเมลทดสอบไม่ถูกต้อง' });
    const result = await sendMail({ to, subject: 'MeetPlanning test email', text: 'SMTP is working.' });
    res.json(result);
  } catch (error) { next(error); }
});

export default router;
