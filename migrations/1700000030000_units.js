export const up = (pgm) => {
  pgm.createTable('units', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    condominium_id: {
      type: 'uuid',
      notNull: true,
      references: 'condominiums(id)',
      onDelete: 'RESTRICT'
    },
    tower_id: { type: 'uuid', notNull: true, references: 'towers(id)', onDelete: 'RESTRICT' },
    number: { type: 'text', notNull: true },
    floor: { type: 'integer' },
    kind: { type: 'text', notNull: true, default: 'departamento' },
    proration_factor: { type: 'numeric(10, 6)', notNull: true, default: 0 },
    area_m2: { type: 'numeric(10, 2)' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('units', 'uq_units_tower_number', {
    unique: ['tower_id', 'number']
  });

  pgm.sql(`CREATE TRIGGER trg_units_updated_at
           BEFORE UPDATE ON units
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('units');
};