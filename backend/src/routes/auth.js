
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';

const router = Router();

function signUser(user) {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    phone: user.phone || '',
  };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = safeUser.role === 'admin'
    ? jwt.sign(safeUser, secret)
    : jwt.sign(safeUser, secret, { expiresIn: '2m' });
  return { token, user: safeUser, expiresInSeconds: safeUser.role === 'admin' ? null : 120 };
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

router.post('/login',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      await ensureLoginAttemptsTable();
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง' });

      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      const user = rows[0];

      const isAdminCandidate = user?.role === 'admin';
      if (!isAdminCandidate) {
        const [[attempt]] = await pool.execute(
          'SELECT COUNT(*) AS failed FROM login_attempts WHERE email = ? AND success = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)',
          [email]
        );
        if (Number(attempt.failed || 0) >= 5) {
          return res.status(429).json({ message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 2 นาที' });
        }
      }

      const passwordOk = user && (
        user.password_hash === password ||
        await bcrypt.compare(password, user.password_hash).catch(() => false)
      );
      await pool.execute('INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)', [email, req.ip, passwordOk ? 1 : 0]);

      if (!passwordOk) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      if (user.status && user.status !== 'active') return res.status(403).json({ message: 'บัญชีนี้ถูกปิดใช้งาน' });

      res.json(signUser(user));
    } catch (error) {
      next(error);
    }
  }
);

router.post('/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วน' });

      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const department = String(req.body.department || '').trim();
      const passwordHash = await bcrypt.hash(String(req.body.password || ''), 10);
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role, status, department) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'user', 'active', department]
      );
      const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
      res.status(201).json(signUser(user));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
