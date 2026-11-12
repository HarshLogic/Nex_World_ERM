const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../../server/src/app');

describe('Integration Tests: Production Server Health & Security Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('GET / returns 200 and friendly JSON API status', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'online');
    assert.strictEqual(body.message, 'Perfume ERP & POS Backend API is running successfully');
    assert.ok(body.version);
    assert.ok(body.endpoints);
  });

  test('GET /health returns 200 and uptime timestamp', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.ok(typeof body.uptime === 'number');
    assert.ok(body.timestamp);
  });

  test('GET /api returns 200 and available endpoints index', async () => {
    const res = await fetch(`${baseUrl}/api`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.endpoints);
    assert.strictEqual(body.endpoints.health, '/api/health');
    assert.strictEqual(body.endpoints.auth, '/api/auth');
  });

  test('POST /api/auth/login rejects empty credentials with 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('POST /api/auth/change-password blocks unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'abc',
        newPassword: '12345678_password',
      }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });
});
