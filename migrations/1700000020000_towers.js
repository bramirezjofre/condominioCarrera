export const up = (pgm) => {
  pgm.createTable('towers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    condominium_id: {
      type: 'uuid',
      notNull: true,
      references: 'condominiums(id)',
      onDelete: 'RESTRICT'
    },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    address_detail: { type: 'text' },
    floor_count: { type: 'integer' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('towers', 'uq_towers_condominium_code', {
    unique: ['condominium_id', 'code']
  });

  pgm.sql(`CREATE TRIGGER trg_towers_updated_at
           BEFORE UPDATE ON towers
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('towers');
};