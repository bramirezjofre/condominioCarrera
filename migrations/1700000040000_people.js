export const up = (pgm) => {
  pgm.createTable('people', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    first_name: { type: 'text', notNull: true },
    last_name: { type: 'text', notNull: true },
    full_name: { type: 'text', notNull: true, default: pgm.func("''") },
    national_id: { type: 'citext' },
    email: { type: 'citext' },
    phone: { type: 'text' },
    birth_date: { type: 'date' },
    notes: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.sql(`ALTER TABLE people
           ADD CONSTRAINT ck_people_full_name_nonempty
           CHECK (length(btrim(full_name)) > 0);`);

  pgm.sql(`CREATE OR REPLACE FUNCTION trg_people_full_name()
           RETURNS trigger AS $$
           BEGIN
             NEW.full_name := btrim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''));
             RETURN NEW;
           END;
           $$ LANGUAGE plpgsql;`);

  pgm.sql(`CREATE TRIGGER trg_people_set_full_name
           BEFORE INSERT OR UPDATE OF first_name, last_name ON people
           FOR EACH ROW EXECUTE FUNCTION trg_people_full_name();`);

  pgm.sql(`CREATE TRIGGER trg_people_updated_at
           BEFORE UPDATE ON people
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('people');
};