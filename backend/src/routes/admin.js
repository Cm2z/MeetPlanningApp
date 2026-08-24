
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/branches', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM branches ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/branches', body('name').notEmpty(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: 'Branch name is required' });
    const [result] = await pool.execute('INSERT INTO branches (name, address) VALUES (?, ?)', [req.body.name, req.body.address || '']);
    res.status(201).json({ id: result.insertId, message: 'Branch created' });
  } catch (error) { next(error); }
});

router.get('/users', requireRole('admin'), async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, role, status, department, phone, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body;
    if (!['staff', 'user'].includes(role)) return res.status(422).json({ message: 'กำหนดได้เฉพาะ User หรือ Staff' });
    if (targetId === Number(req.user.id)) return res.status(422).json({ message: 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีตัวเองได้' });
    const [[target]] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [targetId]);
    if (!target) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });
    if (target.role === 'admin') return res.status(403).json({ message: 'ไม่สามารถเปลี่ยนสิทธิ์ Admin ผ่านหน้านี้ได้' });
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
    await audit(req.user.id, 'change_user_role', 'user', targetId, { from: target.role, to: role, email: target.email });
    res.json({ message: role === 'staff' ? 'แต่งตั้ง Staff เรียบร้อย' : 'เปลี่ยนกลับเป็น User เรียบร้อย' });
  } catch (error) { next(error); }
});

router.delete('/users/:id/booking-history', requireRole('admin'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const targetId = Number(req.params.id);
    const [[target]] = await connection.execute('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [targetId]);
    if (!target) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });
    await connection.beginTransaction();
    const [bookingResult] = await connection.execute('DELETE FROM bookings WHERE user_id = ?', [targetId]);
    const [notificationResult] = await connection.execute('DELETE FROM notifications WHERE user_id = ?', [targetId]);
    await connection.commit();
    await audit(req.user.id, 'clear_user_booking_history', 'user', targetId, {
      email: target.email,
      bookings: bookingResult.affectedRows,
      notifications: notificationResult.affectedRows,
    });
    res.json({
      message: 'ล้างประวัติของ ' + target.name + ' เรียบร้อย',
      deletedBookings: bookingResult.affectedRows,
      deletedNotifications: notificationResult.affectedRows,
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/equipment', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM equipment ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/equipment', body('name').notEmpty(), async (req, res, next) => {
  try {
    const { name, icon = 'Package', totalQuantity = 1, status = 'available' } = req.body;
    const [result] = await pool.execute('INSERT INTO equipment (name, icon, total_quantity, status) VALUES (?, ?, ?, ?)', [name, icon, totalQuantity, status]);
    res.status(201).json({ id: result.insertId, message: 'Equipment created' });
  } catch (error) { next(error); }
});

router.patch('/equipment/:id', async (req, res, next) => {
  try {
    const { name, icon = 'Package', totalQuantity = 1, status = 'available' } = req.body;
    await pool.execute('UPDATE equipment SET name = ?, icon = ?, total_quantity = ?, status = ? WHERE id = ?', [name, icon, totalQuantity, status, req.params.id]);
    res.json({ message: 'Equipment updated' });
  } catch (error) { next(error); }
});

router.delete('/equipment/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM equipment WHERE id = ?', [req.params.id]);
    res.json({ message: 'Equipment deleted' });
  } catch (error) { next(error); }
});

export default router;
