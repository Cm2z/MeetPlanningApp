import assert from 'node:assert/strict';
import { test } from 'node:test';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

test('Express configuration works without starting database workers', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'MeetPlanning API' });
    assert.equal(health.headers.get('x-powered-by'), null);
    assert.ok(health.headers.get('content-security-policy'));

    const missing = await fetch(`${base}/route-that-does-not-exist`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'API route not found' });

    const preflight = await fetch(`${base}/api/bookings`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');

    const protectedRoute = await fetch(`${base}/api/bookings`);
    assert.equal(protectedRoute.status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
