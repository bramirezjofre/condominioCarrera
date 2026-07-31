import { pool } from '../../db/pool.js';
import { withTransaction } from '../../db/transaction.js';

export async function listByUnit(unitId) {
  const { rows } = await pool.query(
    `SELECT uo.id, uo.unit_id, uo.person_id, uo.occupancy_type, uo.is_primary,
            uo.starts_on, uo.ends_on, uo.receives_billing, uo.receives_notifications,
            p.full_name
     FROM unit_occupancies uo
     JOIN people p ON p.id = uo.person_id
     WHERE uo.unit_id = $1
     ORDER BY uo.is_primary DESC, uo.starts_on DESC`,
    [unitId]
  );
  return rows;
}

export async function listByPerson(personId) {
  const { rows } = await pool.query(
    `SELECT uo.id, uo.unit_id, uo.person_id, uo.occupancy_type, uo.is_primary,
            uo.starts_on, uo.ends_on,
            u.number AS unit_number, t.name AS tower_name, t.id AS tower_id
     FROM unit_occupancies uo
     JOIN units u ON u.id = uo.unit_id
     JOIN towers t ON t.id = u.tower_id
     WHERE uo.person_id = $1
     ORDER BY uo.is_primary DESC, uo.starts_on DESC`,
    [personId]
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, unit_id, person_id, occupancy_type, is_primary,
            starts_on, ends_on, receives_billing, receives_notifications
     FROM unit_occupancies WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function create(data) {
  return withTransaction(async (client) => {
    const unit = await client.query(
      `SELECT id, condominium_id FROM units WHERE id = $1 LIMIT 1`,
      [data.unitId]
    );
    if (!unit.rows[0]) {
      const err = new Error('Unidad no encontrada');
      err.status = 404;
      throw err;
    }
    const person = await client.query(
      `SELECT id FROM people WHERE id = $1 AND active = true LIMIT 1`,
      [data.personId]
    );
    if (!person.rows[0]) {
      const err = new Error('Persona no encontrada');
      err.status = 404;
      throw err;
    }

    if (data.isPrimary) {
      await client.query(
        `UPDATE unit_occupancies
           SET ends_on = COALESCE(ends_on, LEAST(CURRENT_DATE, $1::date - 1))
         WHERE unit_id = $2
           AND occupancy_type = $3
           AND is_primary = true
           AND ends_on IS NULL`,
        [data.startsOn, data.unitId, data.occupancyType]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO unit_occupancies
         (unit_id, person_id, occupancy_type, is_primary, starts_on, ends_on,
          receives_billing, receives_notifications, notes)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9)
       RETURNING id, unit_id, person_id, occupancy_type, is_primary,
                 starts_on, ends_on, receives_billing, receives_notifications`,
      [
        data.unitId,
        data.personId,
        data.occupancyType,
        data.isPrimary,
        data.startsOn,
        data.endsOn ?? '',
        data.receivesBilling,
        data.receivesNotifications,
        data.notes ?? null
      ]
    );
    return rows[0];
  });
}

export async function endOccupancy(id, endsOn) {
  const { rows } = await pool.query(
    `UPDATE unit_occupancies
       SET ends_on = $1
     WHERE id = $2 AND ends_on IS NULL
     RETURNING id, unit_id, person_id, occupancy_type, is_primary, starts_on, ends_on`,
    [endsOn, id]
  );
  return rows[0] ?? null;
}