const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../../server/src/app');

describe('Integration Tests: Production CORS Security & Authentication Headers', () => {
  let server;
  let baseUrl;
  const PROD_ORIGIN = 'https://nexperfumeerp.up.railway.app';
  const LOCAL_ORIGIN = 'http://localhost:3000';
  const FORBIDDEN_ORIGIN = 'https://unauthorized-hacker-site.com';

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

  test('OPTIONS /api/auth/me from production frontend returns 200 with complete CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: PROD_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });

    assert.ok(res.status === 200 || res.status === 204, `Expected 200 or 204, got ${res.status}`);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    const allowMethods = res.headers.get('access-control-allow-methods') || '';
    assert.ok(allowMethods.includes('GET'));
    assert.ok(allowMethods.includes('POST'));
    assert.ok(allowMethods.includes('OPTIONS'));
    const allowHeaders = res.headers.get('access-control-allow-headers') || '';
    assert.ok(allowHeaders.toLowerCase().includes('authorization'));
    assert.ok(allowHeaders.toLowerCase().includes('content-type'));
  });

  test('OPTIONS /api/auth/login from production frontend returns 200 with credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: PROD_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    assert.ok(res.status === 200 || res.status === 204);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('GET /api/auth/me unauthorized request retains CORS headers and returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Origin: PROD_ORIGIN,
        Accept: 'application/json',
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('POST /api/auth/login validation error retains CORS headers and returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: PROD_ORIGIN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('GET /health endpoint retains CORS headers for production frontend', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Origin: PROD_ORIGIN,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
  });

  test('GET /api/health endpoint retains CORS headers for production frontend', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        Origin: PROD_ORIGIN,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
  });

  test('Requests from local development origin (http://localhost:3000) are allowed', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: LOCAL_ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    });

    assert.ok(res.status === 200 || res.status === 204);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), LOCAL_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('Requests from unapproved origins do not receive Access-Control-Allow-Origin header', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: FORBIDDEN_ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    });

    // Unapproved origins MUST NOT receive Access-Control-Allow-Origin
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(allowOrigin, FORBIDDEN_ORIGIN);
    assert.strictEqual(allowOrigin, null);
  });
});
