const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function getSession() {
  return null;
}
export function saveSession(_session) {}
export function clearSession() {}
export async function api(path, options = {}) {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}
