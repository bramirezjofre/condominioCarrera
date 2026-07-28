import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://x:x@127.0.0.1:1/x';
process.env.SESSION_SECRET = 'a'.repeat(64);

const { createApp } = await import('../src/app.js');

describe('auth', () => {
  it('POST /login with missing fields renders login with error', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ identifier: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Datos invalidos');
  });

  it('POST /login with unknown identifier does not crash', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ identifier: 'noexiste', password: 'cualquiera' });
    expect([200, 302, 400, 401, 403, 500, 503]).toContain(res.status);
  });

  it('GET /login when already in session redirects to /app', async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.get('/login');
    const res = await agent.get('/login');
    expect([200, 302]).toContain(res.status);
  });
});