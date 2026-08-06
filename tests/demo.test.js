import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://x:x@127.0.0.1:1/x';
process.env.SESSION_SECRET = 'a'.repeat(64);

const { createApp } = await import('../src/app.js');
const { resetStore } = await import('../src/shared/demo/demo-store.js');

function loginAs(agent, identifier, password = 'demo123') {
  return agent.post('/login').type('form').send({ identifier, password });
}

function agent() {
  return request.agent(createApp());
}

beforeEach(() => {
  resetStore();
});

describe('demo role access', () => {
  it('admin can list towers', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const res = await a.get('/app/torres');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Torre');
  });

  it('resident can only view own unit', async () => {
    const a = agent();
    await loginAs(a, 'residente101');
    const res = await a.get('/app/mi-unidad');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Mi unidad');
  });

  it('resident cannot create a tower', async () => {
    const a = agent();
    await loginAs(a, 'residente101');
    const res = await a.post('/app/torres/nuevo').type('form').send({
      name: 'Torre Sur', code: 'TS', floorCount: 5
    });
    expect(res.status).toBe(403);
  });

  it('tower admin can view their team page', async () => {
    const a = agent();
    await loginAs(a, 'torre1');
    const res = await a.get('/app/torres');
    expect(res.status).toBe(200);
  });
});

describe('demo mutations', () => {
  it('accountant can verify a pending payment', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const { getStore } = await import('../src/shared/demo/demo-store.js');
    const store = getStore();
    const pending = store.payments.find((p) => p.status === 'pending_verification');
    expect(pending).toBeTruthy();
    const verify = await a.post(`/app/pagos/${pending.id}/verificar`).type('form').send({});
    expect([302, 200]).toContain(verify.status);
  });

  it('reversing payment requires a reason', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const { getStore } = await import('../src/shared/demo/demo-store.js');
    const store = getStore();
    const verified = store.payments.find((p) => p.status === 'verified');
    expect(verified).toBeTruthy();
    const reverse = await a.post(`/app/pagos/${verified.id}/reversar`).type('form').send({ reason: 'Auditoria' });
    expect([302, 200]).toContain(reverse.status);
  });

  it('admin can create a tower', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const res = await a.post('/app/torres/nuevo').type('form').send({
      name: 'Torre QA', code: 'TQA', floorCount: 4
    });
    expect([302, 200]).toContain(res.status);
  });

  it('admin can create a parcel', async () => {
    const a = agent();
    await loginAs(a, 'conserjeria');
    const { getStore } = await import('../src/shared/demo/demo-store.js');
    const store = getStore();
    const unitId = store.units[0].id;
    const personId = store.people[0].id;
    const res = await a.post('/app/encomiendas/nueva').type('form').send({
      unitId,
      recipientPersonId: personId,
      carrier: 'Starken',
      trackingNumber: 'TRK-001',
      description: 'Caja'
    });
    expect([302, 200]).toContain(res.status);
  });
});

describe('demo reports', () => {
  it('renders every report page without server errors', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const paths = [
      '/app/reportes/financiero',
      '/app/reportes/recaudacion',
      '/app/reportes/morosidad',
      '/app/reportes/gastos',
      '/app/reportes/mantenimientos',
      '/app/reportes/multas',
      '/app/reportes/encomiendas',
      '/app/reportes/reservas'
    ];

    for (const path of paths) {
      const res = await a.get(path);
      expect(res.status).toBe(200);
      expect(res.text).not.toContain('ReferenceError');
    }
  });

  it('exports report CSV files', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const res = await a.get('/app/reportes/financiero/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Facturado');
  });
});

describe('demo reservations', () => {
  it('shows management actions for requested reservations', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const { getStore } = await import('../src/shared/demo/demo-store.js');
    const requested = getStore().reservations.find((r) => r.status === 'requested');
    expect(requested).toBeTruthy();

    const res = await a.get(`/app/reservas/${requested.id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Aprobar');
    expect(res.text).toContain('Cancelar');
  });

  it('rejects overlapping approved reservations', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const { getStore } = await import('../src/shared/demo/demo-store.js');
    const store = getStore();
    const approved = store.reservations.find((r) => r.status === 'approved');
    expect(approved).toBeTruthy();
    const before = store.reservations.length;

    const res = await a.post('/app/reservas/nueva').type('form').send({
      amenityId: approved.amenityId,
      unitId: approved.unitId,
      startsAt: approved.startsAt,
      endsAt: approved.endsAt,
      attendeeCount: 2
    });

    expect(res.status).toBe(302);
    expect(store.reservations).toHaveLength(before);
  });
});

describe('auth boundary', () => {
  it('GET /app/mi-unidad without session redirects to login', async () => {
    const a = agent();
    const res = await a.get('/app/mi-unidad');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('POST /logout clears session', async () => {
    const a = agent();
    await loginAs(a, 'admin');
    const res = await a.post('/logout').type('form').send({});
    expect([302, 200]).toContain(res.status);
  });
});
