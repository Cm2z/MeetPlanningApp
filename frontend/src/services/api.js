const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Production requests go through the frontend origin. This keeps the HttpOnly
// session cookie first-party even though Railway runs the API as another service.
const SAME_ORIGIN_API_URL = import.meta.env.PROD ? '/api' : null;

export function getSession() {
  return null;
}
export function saveSession(_session) {}
export function clearSession() {}
export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const retryable = method === 'GET';
  const maxRetries = retryable ? 12 : 0;
  let response = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      response = await fetch(`${SAME_ORIGIN_API_URL || API_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
    } catch {
      if (!retryable || attempt === maxRetries) {
        throw new Error('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
      continue;
    }

    if (![502, 503, 504].includes(response.status) || attempt === maxRetries) break;
    try { await response.body?.cancel(); } catch { /* The failed response body is not needed. */ }
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(response.status >= 500
      ? 'ระบบกำลังเริ่มต้น กรุณารอสักครู่แล้วลองใหม่'
      : 'ระบบตอบกลับไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ');
  }
  if (!response.ok) {
    throw new Error(data.message || (response.status >= 500
      ? 'ระบบกำลังเริ่มต้น กรุณารอสักครู่แล้วลองใหม่'
      : 'เกิดข้อผิดพลาด'));
  }
  return data;
}
