import 'dotenv/config';
import { closePool } from '../src/db/pool.js';
import { withTransaction } from '../src/db/transaction.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { logger } from '../src/config/logger.js';
import { env } from '../src/config/env.js';

const ROLE_CODES = ['condominium_admin', 'tower_admin', 'tower_team_member', 'committee', 'accountant', 'concierge', 'resident'];

const PERMISSION_CODES = [
  'users.create',
  'users.read',
  'users.update',
  'users.disable',
  'users.assign_roles',
  'towers.assign_administrator',
  'towers.team.read',
  'towers.team.manage',
  'dashboard.read_all_towers',
  'dashboard.read_assigned_towers'
];

async function ensureRoles(client) {
  await client.query(
    `INSERT INTO roles (code, name, description)
     SELECT c.code, c.name, c.description
     FROM (VALUES ${ROLE_CODES.map((_, i) => `($${i * 3 + 1}::citext, $${i * 3 + 2}, $${i * 3 + 3})`).join(',')}) AS c(code, name, description)
     ON CONFLICT (code) DO NOTHING`,
    ROLE_CODES.flatMap((c) => [c, c.replace(/_/g, ' '), null])
  );
}

async function ensurePermissions(client) {
  await client.query(
    `INSERT INTO permissions (code, description)
     SELECT c.code, c.description
     FROM (VALUES ${PERMISSION_CODES.map((_, i) => `($${i * 2 + 1}::citext, $${i * 2 + 2})`).join(',')}) AS c(code, description)
     ON CONFLICT (code) DO NOTHING`,
    PERMISSION_CODES.flatMap((c) => [c, null])
  );

  await client.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id
     FROM roles r
     CROSS JOIN permissions p
     WHERE r.code = 'condominium_admin'
     ON CONFLICT DO NOTHING`
  );

  const towerAdminPerms = [
    'towers.team.read',
    'towers.team.manage',
    'dashboard.read_assigned_towers',
    'users.read'
  ];
  await client.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id
     FROM roles r
     JOIN permissions p ON p.code = ANY($1::citext[])
     WHERE r.code = 'tower_admin'
     ON CONFLICT DO NOTHING`,
    [towerAdminPerms]
  );
}

async function ensureCondominium(client) {
  const { rows } = await client.query(
    `SELECT id FROM condominiums WHERE name = $1 LIMIT 1`,
    ['Condominio Jose Miguel Carrera']
  );
  if (rows[0]) return rows[0].id;

  const inserted = await client.query(
    `INSERT INTO condominiums (name, legal_name, address, commune, region, timezone, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      'Condominio Jose Miguel Carrera',
      'Condominio Jose Miguel Carrera',
      'Direccion por definir',
      'Santiago',
      'Region Metropolitana',
      'America/Santiago',
      'CLP'
    ]
  );
  return inserted.rows[0].id;
}

async function ensureAdmin(client, condominiumId) {
  const existing = await client.query(
    `SELECT u.id, u.email, u.username
     FROM app_users u
     WHERE lower(u.email) = lower($1) OR lower(u.username) = lower($2)
     LIMIT 1`,
    [env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_USERNAME]
  );
  if (existing.rows[0]) return existing.rows[0];

  const person = await client.query(
    `INSERT INTO people (first_name, last_name, email, active)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [env.SEED_ADMIN_FULL_NAME, '(Administracion)', env.SEED_ADMIN_EMAIL]
  );
  const personId = person.rows[0].id;

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);

  const user = await client.query(
    `INSERT INTO app_users
       (person_id, email, username, password_hash, status, must_change_password)
     VALUES ($1, $2, $3, $4, 'active', true)
     RETURNING id`,
    [personId, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_USERNAME, passwordHash]
  );
  const userId = user.rows[0].id;

  const role = await client.query(`SELECT id FROM roles WHERE code = 'condominium_admin' LIMIT 1`);
  if (!role.rows[0]) throw new Error('Rol condominium_admin no existe tras ensureRoles');

  await client.query(
    `INSERT INTO user_role_assignments
       (user_id, role_id, condominium_id, scope_type, is_primary, assigned_by)
     VALUES ($1, $2, $3, 'condominium', true, $1)`,
    [userId, role.rows[0].id, condominiumId]
  );

  return { id: userId, email: env.SEED_ADMIN_EMAIL, username: env.SEED_ADMIN_USERNAME };
}

async function ensureTower(client, condominiumId, code, name) {
  const { rows } = await client.query(
    `SELECT id FROM towers WHERE condominium_id = $1 AND code = $2 LIMIT 1`,
    [condominiumId, code]
  );
  if (rows[0]) return rows[0].id;
  const inserted = await client.query(
    `INSERT INTO towers (condominium_id, name, code, floor_count, active)
     VALUES ($1, $2, $3, 10, true)
     RETURNING id`,
    [condominiumId, name, code]
  );
  return inserted.rows[0].id;
}

async function ensureUnit(client, condominiumId, towerId, number, floor) {
  const { rows } = await client.query(
    `SELECT id FROM units WHERE tower_id = $1 AND number = $2 LIMIT 1`,
    [towerId, number]
  );
  if (rows[0]) return rows[0].id;
  const inserted = await client.query(
    `INSERT INTO units
       (condominium_id, tower_id, number, floor, kind, proration_factor, area_m2, active)
     VALUES ($1, $2, $3, $4, 'departamento', 0.001000, 60, true)
     RETURNING id`,
    [condominiumId, towerId, number, floor]
  );
  return inserted.rows[0].id;
}

async function ensureTowerAdmin(client, condominiumId, towerId, email, username, fullName, password, assignedBy) {
  const existing = await client.query(
    `SELECT u.id FROM app_users u
     WHERE lower(u.email) = lower($1) OR lower(u.username) = lower($2)
     LIMIT 1`,
    [email, username]
  );
  let userId;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
  } else {
    const person = await client.query(
      `INSERT INTO people (first_name, last_name, email, active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [fullName, '(Torre)', email]
    );
    const passwordHash = await hashPassword(password);
    const user = await client.query(
      `INSERT INTO app_users (person_id, email, username, password_hash, status, must_change_password)
       VALUES ($1, $2, $3, $4, 'active', true)
       RETURNING id`,
      [person.rows[0].id, email, username, passwordHash]
    );
    userId = user.rows[0].id;
  }

  const role = await client.query(`SELECT id FROM roles WHERE code = 'tower_admin' LIMIT 1`);
  if (!role.rows[0]) throw new Error('Rol tower_admin no existe tras ensureRoles');

  await client.query(
    `UPDATE user_role_assignments
       SET ends_at = now()
     WHERE user_id = $1
       AND scope_type = 'tower'
       AND tower_id = $2
       AND ends_at IS NULL`,
    [userId, towerId]
  );

  const exists = await client.query(
    `SELECT 1 FROM user_role_assignments
     WHERE user_id = $1
       AND role_id = $2
       AND condominium_id = $3
       AND scope_type = 'tower'
       AND tower_id = $4
       AND ends_at IS NULL
     LIMIT 1`,
    [userId, role.rows[0].id, condominiumId, towerId]
  );
  if (!exists.rows[0]) {
    await client.query(
      `INSERT INTO user_role_assignments
         (user_id, role_id, condominium_id, scope_type, tower_id, is_primary, assigned_by)
       VALUES ($1, $2, $3, 'tower', $4, true, $5)`,
      [userId, role.rows[0].id, condominiumId, towerId, assignedBy]
    );
  }

  return userId;
}

async function main() {
  try {
    const result = await withTransaction(async (client) => {
      await ensureRoles(client);
      await ensurePermissions(client);
      const condominiumId = await ensureCondominium(client);
      const admin = await ensureAdmin(client, condominiumId);

      const torre1 = await ensureTower(client, condominiumId, 'T1', 'Torre 1');
      const torre2 = await ensureTower(client, condominiumId, 'T2', 'Torre 2');

      await ensureUnit(client, condominiumId, torre1, '101', 1);
      await ensureUnit(client, condominiumId, torre1, '102', 1);
      await ensureUnit(client, condominiumId, torre2, '201', 2);

      await ensureTowerAdmin(
        client,
        condominiumId,
        torre1,
        'torre1@condominio.cl',
        'torre1',
        'Admin Torre 1',
        'CambiarEsto123!',
        admin.id
      );
      await ensureTowerAdmin(
        client,
        condominiumId,
        torre2,
        'torre2@condominio.cl',
        'torre2',
        'Admin Torre 2',
        'CambiarEsto123!',
        admin.id
      );

      const resident1 = await client.query(
        `INSERT INTO people (first_name, last_name, email, phone, active)
         VALUES ('Residente', 'Demo 101', 'res101@condominio.cl', '+56911111111', true)
         ON CONFLICT DO NOTHING
         RETURNING id`
      );
      const resident2 = await client.query(
        `INSERT INTO people (first_name, last_name, email, phone, active)
         VALUES ('Residente', 'Demo 102', 'res102@condominio.cl', '+56911111112', true)
         ON CONFLICT DO NOTHING
         RETURNING id`
      );
      const unit101 = await client.query(
        `SELECT id FROM units WHERE tower_id = $1 AND number = '101' LIMIT 1`,
        [torre1]
      );
      const unit102 = await client.query(
        `SELECT id FROM units WHERE tower_id = $1 AND number = '102' LIMIT 1`,
        [torre1]
      );
      if (unit101.rows[0] && resident1.rows[0]) {
        await client.query(
          `INSERT INTO unit_occupancies
             (unit_id, person_id, occupancy_type, is_primary, starts_on, receives_billing, receives_notifications)
           VALUES ($1, $2, 'owner', true, current_date, true, true)
           ON CONFLICT DO NOTHING`,
          [unit101.rows[0].id, resident1.rows[0].id]
        );
      }
      if (unit102.rows[0] && resident2.rows[0]) {
        await client.query(
          `INSERT INTO unit_occupancies
             (unit_id, person_id, occupancy_type, is_primary, starts_on, receives_billing, receives_notifications)
           VALUES ($1, $2, 'tenant', true, current_date, true, true)
           ON CONFLICT DO NOTHING`,
          [unit102.rows[0].id, resident2.rows[0].id]
        );
      }

      return { condominiumId, admin, torre1, torre2 };
    });

    logger.info(
      {
        admin: result.admin,
        condominiumId: result.condominiumId,
        torre1: result.torre1,
        torre2: result.torre2
      },
      'Seed completado'
    );
    console.log(
      'Seed completado. Admin:',
      result.admin.email,
      '/',
      result.admin.username,
      '| Torre 1: torre1@condominio.cl / Torre 2: torre2@condominio.cl'
    );
  } catch (err) {
    logger.error({ err }, 'Error en seed');
    console.error('Error en seed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();