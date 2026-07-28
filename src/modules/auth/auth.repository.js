import { pool } from '../../db/pool.js';

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DISABLED: 'disabled'
});

export async function findUserByIdentifier(identifier) {
  const sql = `
    SELECT u.id, u.person_id, u.email, u.username, u.password_hash,
           u.status, u.failed_login_count, u.locked_until,
           u.must_change_password, u.deleted_at, p.full_name
    FROM app_users u
    JOIN people p ON p.id = u.person_id
    WHERE u.deleted_at IS NULL
      AND (lower(u.email) = lower($1) OR lower(u.username) = lower($1))
    LIMIT 1`;
  const { rows } = await pool.query(sql, [identifier]);
  return rows[0] ?? null;
}

export async function getUserContext(userId) {
  const sql = `
    SELECT
      u.id AS user_id,
      u.person_id,
      u.must_change_password,
      u.status,
      u.email,
      u.username,
      p.full_name,
      array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL) AS role_codes,
      bool_or(
        ura.scope_type = 'condominium'
        AND ura.ends_at IS NULL
        AND r.code = 'condominium_admin'
      ) AS is_condominium_admin,
      array_agg(DISTINCT ura.tower_id) FILTER (
        WHERE ura.scope_type = 'tower' AND ura.ends_at IS NULL
      ) AS tower_ids,
      array_agg(DISTINCT ura.unit_id) FILTER (
        WHERE ura.scope_type = 'unit' AND ura.ends_at IS NULL
      ) AS unit_ids,
      array_agg(DISTINCT perm.code) FILTER (WHERE perm.code IS NOT NULL) AS permission_codes
    FROM app_users u
    JOIN people p ON p.id = u.person_id
    LEFT JOIN user_role_assignments ura
      ON ura.user_id = u.id AND ura.ends_at IS NULL
    LEFT JOIN roles r ON r.id = ura.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions perm ON perm.id = rp.permission_id
    WHERE u.id = $1 AND u.deleted_at IS NULL
    GROUP BY u.id, p.full_name`;
  const { rows } = await pool.query(sql, [userId]);
  return rows[0] ?? null;
}

export async function recordSuccessfulLogin(userId) {
  await pool.query(
    `UPDATE app_users
       SET last_login_at = now(),
           failed_login_count = 0,
           locked_until = NULL
     WHERE id = $1`,
    [userId]
  );
}

export async function recordFailedLogin(userId) {
  await pool.query(
    `UPDATE app_users
       SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
           locked_until = CASE
             WHEN COALESCE(failed_login_count, 0) + 1 >= 5
               THEN now() + interval '15 minutes'
             ELSE locked_until
           END
     WHERE id = $1`,
    [userId]
  );
}

export async function updateLastSession(userId) {
  await pool.query(
    `UPDATE app_users SET last_login_at = now() WHERE id = $1`,
    [userId]
  );
}

export async function createAuditEvent({ actorUserId, action, entityType, entityId, ipAddress, userAgent, success }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, ip_address, user_agent, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [actorUserId, action, entityType ?? null, entityId ?? null, ipAddress ?? null, userAgent ?? null, success ?? true]
    );
  } catch (err) {
    if (err?.code !== '42P01') {
      throw err;
    }
  }
}