export const up = (pgm) => {
  pgm.createTable('app_users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    person_id: { type: 'uuid', notNull: true, references: 'people(id)', onDelete: 'RESTRICT' },
    email: { type: 'citext', notNull: true },
    username: { type: 'citext', notNull: true },
    password_hash: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active', check: "status IN ('active','blocked','disabled')" },
    last_login_at: { type: 'timestamptz' },
    failed_login_count: { type: 'integer', notNull: true, default: 0 },
    locked_until: { type: 'timestamptz' },
    must_change_password: { type: 'boolean', notNull: true, default: false },
    deleted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('app_users', 'lower(email)', { name: 'idx_app_users_email_lower' });
  pgm.createIndex('app_users', 'lower(username)', { name: 'idx_app_users_username_lower' });
  pgm.createIndex('app_users', 'person_id', { name: 'idx_app_users_person' });

  pgm.sql(`CREATE TRIGGER trg_app_users_updated_at
           BEFORE UPDATE ON app_users
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('app_users');
};