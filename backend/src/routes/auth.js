
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { AUTH_COOKIE, requireAuth } from '../middleware/auth.js';

const router = Router();
const authRequests = new Map();

function limitAuthRequests(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (authRequests.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= 30) return res.status(429).json({ message: 'ส่งคำขอมากเกินไป กรุณารอ 15 นาที' });
  recent.push(now);
  authRequests.set(key, recent);
  return next();
}

function signUser(user) {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    phone: user.phone || '',
  };
  const secret = process.env.JWT_SECRET || 'development-only-secret-change-me';
  const expiresInSeconds = 8 * 60 * 60;
  const token = jwt.sign(safeUser, secret, {
    algorithm: 'HS256', expiresIn: expiresInSeconds,
    issuer: 'meetplanning-api', audience: 'meetplanning-web',
  });
  return { token, user: safeUser, expiresInSeconds };
}

async function ensureLoginAttemptsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL,
      ip_address VARCHAR(80) NULL,
      success TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_login_email_time (email, created_at)
    )
  `);
}

function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    // Frontend and API are deployed on separate Railway hostnames.
    sameSite: production ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  };
}

function clearCookieOptions() {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  return options;
}

function establishSession(res, user, status = 200) {
  const signed = signUser(user);
  res.cookie(AUTH_COOKIE, signed.token, cookieOptions());
  return res.status(status).json({ user: signed.user, expiresInSeconds: signed.expiresInSeconds });
}

router.post('/login', limitAuthRequests,
  body('email').isEmail(),
  body('password').isLength({ min: 6, max: 128 }),
  async (req, res, next) => {
    try {
      await ensureLoginAttemptsTable();
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง' });

      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      const user = rows[0];

      const [[attempt]] = await pool.execute(
        'SELECT COUNT(*) AS failed FROM login_attempts WHERE (email = ? OR ip_address = ?) AND success = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)',
        [email, req.ip]
      );
      if (Number(attempt.failed || 0) >= 5) {
        return res.status(429).json({ message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 10 นาที' });
      }

      const passwordOk = Boolean(user && await bcrypt.compare(password, user.password_hash).catch(() => false));
      await pool.execute('INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)', [email, req.ip, passwordOk ? 1 : 0]);

      if (!passwordOk) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      if (user.status && user.status !== 'active') return res.status(403).json({ message: 'บัญชีนี้ถูกปิดใช้งาน' });

      establishSession(res, user);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/register', limitAuthRequests,
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8, max: 128 }),
  body('department').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วน' });

      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const department = String(req.body.department || '').trim();
      const passwordHash = await bcrypt.hash(String(req.body.password || ''), 12);
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role, status, department) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'user', 'active', department]
      );
      const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
      establishSession(res, user, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/session', requireAuth, async (req, res, next) => {
  try {
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ? AND status = "active" LIMIT 1', [req.user.id]);
    if (!user) return res.status(401).json({ message: 'ไม่พบเซสชันผู้ใช้' });
    const { token: _token, ...session } = signUser(user);
    res.json(session);
  } catch (error) { next(error); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions());
  res.json({ ok: true });
});

export default router;
