import { pool } from '../../db/pool.js';

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, full_name, national_id, email, phone, birth_date, notes, active
     FROM people WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function search({ condominiumId, search = '', limit = 50, offset = 0 }) {
  const { rows } = await pool.query(
    `SELECT DISTINCT p.id, p.first_name, p.last_name, p.full_name, p.email, p.phone
     FROM people p
     LEFT JOIN unit_occupancies uo ON uo.person_id = p.id
     LEFT JOIN units u ON u.id = uo.unit_id
     WHERE p.active = true
       AND ($1::uuid IS NULL OR p.id IN (
         SELECT uo2.person_id FROM unit_occupancies uo2
         JOIN units u2 ON u2.id = uo2.unit_id
         WHERE u2.condominium_id = $1
       ))
       AND ($2 = '' OR p.full_name ILIKE '%' || $2 || '%' OR p.email ILIKE '%' || $2 || '%')
     ORDER BY p.last_name, p.first_name
     LIMIT $3 OFFSET $4`,
    [condominiumId ?? null, search, limit, offset]
  );
  return rows;
}

export async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO people (first_name, last_name, national_id, email, phone, birth_date, notes)
     VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7)
     RETURNING id, first_name, last_name, full_name, national_id, email, phone, birth_date, notes, active`,
    [
      data.firstName,
      data.lastName,
      data.nationalId ?? null,
      data.email ?? '',
      data.phone ?? null,
      data.birthDate ?? null,
      data.notes ?? null
    ]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  if (data.firstName !== undefined) {
    fields.push(`first_name = $${i++}`);
    values.push(data.firstName);
  }
  if (data.lastName !== undefined) {
    fields.push(`last_name = $${i++}`);
    values.push(data.lastName);
  }
  if (data.nationalId !== undefined) {
    fields.push(`national_id = $${i++}`);
    values.push(data.nationalId);
  }
  if (data.email !== undefined) {
    fields.push(`email = NULLIF($${i++}, '')`);
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${i++}`);
    values.push(data.phone);
  }
  if (data.birthDate !== undefined) {
    fields.push(`birth_date = $${i++}`);
    values.push(data.birthDate);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${i++}`);
    values.push(data.notes);
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE people SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, first_name, last_name, full_name, national_id, email, phone, birth_date, notes, active`,
    values
  );
  return rows[0] ?? null;
}