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

async function main() {
  try {
    const result = await withTransaction(async (client) => {
      await ensureRoles(client);
      await ensurePermissions(client);
      const condominiumId = await ensureCondominium(client);
      const admin = await ensureAdmin(client, condominiumId);
      return { condominiumId, admin };
    });

    logger.info({ admin: result.admin, condominiumId: result.condominiumId }, 'Seed completado');
    console.log('Seed completado. Admin:', result.admin.email, '/', result.admin.username);
  } catch (err) {
    logger.error({ err }, 'Error en seed');
    console.error('Error en seed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();