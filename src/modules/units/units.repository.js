import { pool } from '../../db/pool.js';

async function getTowerCondominium(towerId) {
  const { rows } = await pool.query(
    `SELECT id, condominium_id FROM towers WHERE id = $1 LIMIT 1`,
    [towerId]
  );
  return rows[0] ?? null;
}

export async function listByTower(towerId) {
  const { rows } = await pool.query(
    `SELECT id, condominium_id, tower_id, number, floor, kind, proration_factor, area_m2, active
     FROM units WHERE tower_id = $1
     ORDER BY number`,
    [towerId]
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, condominium_id, tower_id, number, floor, kind, proration_factor, area_m2, active
     FROM units WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function create({ towerId, number, floor, kind, prorationFactor, areaM2 }) {
  const tower = await getTowerCondominium(towerId);
  if (!tower) {
    const err = new Error('Torre no encontrada');
    err.status = 404;
    throw err;
  }
  const { rows } = await pool.query(
    `INSERT INTO units
       (condominium_id, tower_id, number, floor, kind, proration_factor, area_m2)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, condominium_id, tower_id, number, floor, kind, proration_factor, area_m2, active`,
    [tower.condominium_id, towerId, number, floor ?? null, kind, prorationFactor, areaM2 ?? null]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  if (data.number !== undefined) {
    fields.push(`number = $${i++}`);
    values.push(data.number);
  }
  if (data.floor !== undefined) {
    fields.push(`floor = $${i++}`);
    values.push(data.floor);
  }
  if (data.kind !== undefined) {
    fields.push(`kind = $${i++}`);
    values.push(data.kind);
  }
  if (data.prorationFactor !== undefined) {
    fields.push(`proration_factor = $${i++}`);
    values.push(data.prorationFactor);
  }
  if (data.areaM2 !== undefined) {
    fields.push(`area_m2 = $${i++}`);
    values.push(data.areaM2);
  }
  if (data.active !== undefined) {
    fields.push(`active = $${i++}`);
    values.push(data.active);
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE units SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, condominium_id, tower_id, number, floor, kind, proration_factor, area_m2, active`,
    values
  );
  return rows[0] ?? null;
}