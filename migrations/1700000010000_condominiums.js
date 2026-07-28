export const up = (pgm) => {
  pgm.createTable('condominiums', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    legal_name: { type: 'text' },
    tax_id: { type: 'text' },
    address: { type: 'text' },
    commune: { type: 'text' },
    region: { type: 'text' },
    timezone: { type: 'text', notNull: true, default: 'America/Santiago' },
    currency: { type: 'text', notNull: true, default: 'CLP' },
    logo_path: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.sql(`CREATE TRIGGER trg_condominiums_updated_at
           BEFORE UPDATE ON condominiums
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('condominiums');
};