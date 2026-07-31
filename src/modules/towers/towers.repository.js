import { pool } from '../../db/pool.js';
import { withTransaction } from '../../db/transaction.js';

export async function listByCondominium(condominiumId, { onlyActive = true } = {}) {
  const { rows } = await pool.query(
    `SELECT id, condominium_id, name, code, address_detail, floor_count, active
     FROM towers
     WHERE condominium_id = $1
       AND ($2::boolean IS FALSE OR active = true)
     ORDER BY code`,
    [condominiumId, onlyActive]
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, condominium_id, name, code, address_detail, floor_count, active
     FROM towers WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO towers (condominium_id, name, code, address_detail, floor_count)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0))
     RETURNING id, condominium_id, name, code, address_detail, floor_count, active`,
    [
      data.condominiumId,
      data.name,
      data.code,
      data.addressDetail ?? null,
      data.floorCount ?? null
    ]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  if (data.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(data.name);
  }
  if (data.code !== undefined) {
    fields.push(`code = $${i++}`);
    values.push(data.code);
  }
  if (data.addressDetail !== undefined) {
    fields.push(`address_detail = $${i++}`);
    values.push(data.addressDetail);
  }
  if (data.floorCount !== undefined) {
    fields.push(`floor_count = $${i++}`);
    values.push(data.floorCount);
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE towers SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, condominium_id, name, code, address_detail, floor_count, active`,
    values
  );
  return rows[0] ?? null;
}

export async function getActiveAdministrator(towerId) {
  const { rows } = await pool.query(
    `SELECT ura.id AS assignment_id,
            u.id AS user_id,
            u.email,
            u.username,
            p.full_name,
            ura.starts_at
     FROM user_role_assignments ura
     JOIN app_users u ON u.id = ura.user_id
     JOIN people p ON p.id = u.person_id
     JOIN roles r ON r.id = ura.role_id
     WHERE ura.tower_id = $1
       AND ura.scope_type = 'tower'
       AND ura.is_primary = true
       AND ura.ends_at IS NULL
       AND r.code = 'tower_admin'
     LIMIT 1`,
    [towerId]
  );
  return rows[0] ?? null;
}

export async function assignAdministrator({ towerId, userId, assignedBy }) {
  return withTransaction(async (client) => {
    const tower = await client.query(
      `SELECT id, condominium_id FROM towers WHERE id = $1 LIMIT 1`,
      [towerId]
    );
    if (!tower.rows[0]) {
      const err = new Error('Torre no encontrada');
      err.status = 404;
      throw err;
    }
    const condominiumId = tower.rows[0].condominium_id;

    const user = await client.query(
      `SELECT u.id, u.status, u.deleted_at
       FROM app_users u
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );
    if (!user.rows[0] || user.rows[0].deleted_at || user.rows[0].status !== 'active') {
      const err = new Error('Usuario no disponible');
      err.status = 400;
      throw err;
    }

    const role = await client.query(
      `SELECT id FROM roles WHERE code = 'tower_admin' LIMIT 1`
    );
    if (!role.rows[0]) {
      const err = new Error('Rol tower_admin no existe');
      err.status = 500;
      throw err;
    }

    await client.query(
      `UPDATE user_role_assignments
         SET ends_at = now()
       WHERE scope_type = 'tower'
         AND tower_id = $1
         AND is_primary = true
         AND ends_at IS NULL`,
      [towerId]
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

    let assignmentId;
    if (exists.rows[0]) {
      const upd = await client.query(
        `UPDATE user_role_assignments
           SET is_primary = true, assigned_by = $5
         WHERE user_id = $1
           AND role_id = $2
           AND condominium_id = $3
           AND scope_type = 'tower'
           AND tower_id = $4
           AND ends_at IS NULL
         RETURNING id`,
        [userId, role.rows[0].id, condominiumId, towerId, assignedBy]
      );
      assignmentId = upd.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO user_role_assignments
           (user_id, role_id, condominium_id, scope_type, tower_id, is_primary, assigned_by)
         VALUES ($1, $2, $3, 'tower', $4, true, $5)
         RETURNING id`,
        [userId, role.rows[0].id, condominiumId, towerId, assignedBy]
      );
      assignmentId = ins.rows[0].id;
    }

    return { assignmentId, condominiumId, userId, towerId };
  });
}