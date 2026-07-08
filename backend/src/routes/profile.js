
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    department: row.department || '',
    phone: row.phone || '',
    role: row.role || 'user',
    created_at: row.created_at || null,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [[user]] = await pool.execute(
      'SELECT id, name, email, department, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const department = String(req.body.department || '').trim();
    const phone = String(req.body.phone || '').trim();
    if (!name) return res.status(422).json({ message: 'กรุณากรอกชื่อ-นามสกุล' });

    await pool.execute(
      'UPDATE users SET name = ?, department = ?, phone = ? WHERE id = ?',
      [name, department, phone, req.user.id]
    );
    const [[user]] = await pool.execute(
      'SELECT id, name, email, department, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.patch('/password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!currentPassword || newPassword.length < 6) {
      return res.status(422).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const [[user]] = await pool.execute('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const passwordOk = user && (
      user.password_hash === currentPassword ||
      await bcrypt.compare(currentPassword, user.password_hash).catch(() => false)
    );
    if (!passwordOk) return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
