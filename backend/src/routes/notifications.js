import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ADMIN_DELETE_CODE = process.env.ADMIN_DELETE_CODE || '1234';

function toInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function userId(req) {
  return Number.parseInt(req.user?.id, 10) || 0;
}

async function ensureNotificationColumns() {
  try {
    await pool.query('ALTER TABLE notifications ADD COLUMN user_deleted_at DATETIME NULL');
  } catch {}
}

function accessWhere(req) {
  const id = userId(req);
  if (req.user.role === 'admin' || req.user.role === 'staff') {
    return { where: "(user_id = ? OR role_target IN ('admin','staff','admin_staff'))", params: [id] };
  }
  return { where: 'user_id = ? AND user_deleted_at IS NULL', params: [id] };
}

function assertAdminDelete(req) {
  if (req.user.role !== 'admin') {
    const error = new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    error.status = 403;
    throw error;
  }
  if (String(req.body?.deleteCode || '') !== ADMIN_DELETE_CODE) {
    const error = new Error('รหัสยืนยันการลบไม่ถูกต้อง');
    error.status = 403;
    throw error;
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    await ensureNotificationColumns();
    const page = toInt(req.query.page, 1, 1, 100000);
    const limit = toInt(req.query.limit, 30, 1, 80);
    const offset = (page - 1) * limit;
    const access = accessWhere(req);
    const conditions = [access.where];
    const params = [...access.params];

    if (req.query.unread === 'true') conditions.push('is_read = 0');
    if (req.query.q) {
      const keyword = '%' + String(req.query.q).trim() + '%';
      conditions.push('(title LIKE ? OR message LIKE ?)');
      params.push(keyword, keyword);
    }

    const where = conditions.join(' AND ');
    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread_count FROM notifications WHERE ' + where,
      params
    );

    const [rows] = await pool.execute(
      'SELECT id, user_id, role_target, title, message, link, is_read, created_at FROM notifications WHERE ' + where + ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
      params
    );

    res.json({
      data: rows,
      page,
      limit,
      total: Number(countRow.total || 0),
      unreadCount: Number(countRow.unread_count || 0),
      hasMore: offset + rows.length < Number(countRow.total || 0),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await ensureNotificationColumns();
    const id = toInt(req.params.id, 0, 1, 2147483647);
    const access = accessWhere(req);
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND ' + access.where, [id, ...access.params]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await ensureNotificationColumns();
    const access = accessWhere(req);
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE ' + access.where, access.params);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureNotificationColumns();
    const id = toInt(req.params.id, 0, 1, 2147483647);
    if (req.user.role === 'admin') {
      assertAdminDelete(req);
      const [result] = await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);
      return res.json({ ok: true, deleted: result.affectedRows });
    }
    const [result] = await pool.execute(
      'UPDATE notifications SET user_deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId(req)]
    );
    res.json({ ok: true, deleted: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-delete', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await ensureNotificationColumns();
    assertAdminDelete(req);
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (!ids.length) return res.status(422).json({ message: 'ไม่พบรายการที่ต้องการลบ' });
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.execute('DELETE FROM notifications WHERE id IN (' + placeholders + ')', ids);
    res.json({ ok: true, deleted: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

export default router;
