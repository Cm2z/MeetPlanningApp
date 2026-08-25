import jwt from 'jsonwebtoken';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32 || secret.includes('change-this'))) {
    throw new Error('JWT_SECRET must be a random value of at least 32 characters in production');
  }
  return secret || 'development-only-secret-change-me';
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
  try {
    req.user = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'meetplanning-api',
      audience: 'meetplanning-web',
    });
    return next();
  } catch {
    return res.status(401).json({ message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการนี้' });
    return next();
  };
}
