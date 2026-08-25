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
  const session = getSession();
  const response = await fetch(`${SAME_ORIGIN_API_URL || API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}
