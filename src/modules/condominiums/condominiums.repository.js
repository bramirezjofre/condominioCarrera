import { pool } from '../../db/pool.js';

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, legal_name, tax_id, address, commune, region, timezone, currency, active
     FROM condominiums
     WHERE id = $1 AND active = true
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listAll() {
  const { rows } = await pool.query(
    `SELECT id, name, timezone, currency, active
     FROM condominiums
     WHERE active = true
     ORDER BY name`
  );
  return rows;
}

export async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO condominiums
       (name, legal_name, tax_id, address, commune, region, timezone, currency)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'America/Santiago'), COALESCE($8, 'CLP'))
     RETURNING id, name, legal_name, tax_id, address, commune, region, timezone, currency, active`,
    [
      data.name,
      data.legalName ?? null,
      data.taxId ?? null,
      data.address ?? null,
      data.commune ?? null,
      data.region ?? null,
      data.timezone ?? null,
      data.currency ?? null
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
  if (data.legalName !== undefined) {
    fields.push(`legal_name = $${i++}`);
    values.push(data.legalName);
  }
  if (data.taxId !== undefined) {
    fields.push(`tax_id = $${i++}`);
    values.push(data.taxId);
  }
  if (data.address !== undefined) {
    fields.push(`address = $${i++}`);
    values.push(data.address);
  }
  if (data.commune !== undefined) {
    fields.push(`commune = $${i++}`);
    values.push(data.commune);
  }
  if (data.region !== undefined) {
    fields.push(`region = $${i++}`);
    values.push(data.region);
  }
  if (data.timezone !== undefined) {
    fields.push(`timezone = $${i++}`);
    values.push(data.timezone);
  }
  if (data.currency !== undefined) {
    fields.push(`currency = $${i++}`);
    values.push(data.currency);
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE condominiums SET ${fields.join(', ')}
     WHERE id = $${i}
     RETURNING id, name, legal_name, tax_id, address, commune, region, timezone, currency, active`,
    values
  );
  return rows[0] ?? null;
}