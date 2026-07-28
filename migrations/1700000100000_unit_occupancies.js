export const up = (pgm) => {
  pgm.createTable('unit_occupancies', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    unit_id: { type: 'uuid', notNull: true, references: 'units(id)', onDelete: 'CASCADE' },
    person_id: { type: 'uuid', notNull: true, references: 'people(id)', onDelete: 'RESTRICT' },
    occupancy_type: {
      type: 'text',
      notNull: true,
      check: "occupancy_type IN ('owner','tenant','resident','authorized')"
    },
    is_primary: { type: 'boolean', notNull: true, default: false },
    starts_on: { type: 'date', notNull: true, default: pgm.func('current_date') },
    ends_on: { type: 'date' },
    receives_billing: { type: 'boolean', notNull: true, default: false },
    receives_notifications: { type: 'boolean', notNull: true, default: false },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('unit_occupancies', 'ck_unit_occupancy_dates', {
    check: `ends_on IS NULL OR ends_on >= starts_on`
  });

  pgm.createIndex('unit_occupancies', ['unit_id', 'starts_on', 'ends_on'], {
    name: 'idx_occupancies_unit'
  });
  pgm.createIndex('unit_occupancies', ['person_id', 'starts_on', 'ends_on'], {
    name: 'idx_occupancies_person'
  });

  pgm.sql(`CREATE TRIGGER trg_unit_occupancies_updated_at
           BEFORE UPDATE ON unit_occupancies
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('unit_occupancies');
};