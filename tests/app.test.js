import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://x:x@127.0.0.1:1/x';
process.env.SESSION_SECRET = 'a'.repeat(64);

const { createApp } = await import('../src/app.js');

describe('app basics', () => {
  it('GET /health/live returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /login renders login page', async () => {
    const app = createApp();
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Ingresar');
  });

  it('GET /app without session redirects to /login', async () => {
    const app = createApp();
    const res = await request(app).get('/app');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});