export const up = (pgm) => {
  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'citext', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'citext', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('role_permissions', {
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    permission_id: { type: 'uuid', notNull: true, references: 'permissions(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('role_permissions', 'pk_role_permissions', {
    primaryKey: ['role_id', 'permission_id']
  });

  pgm.createTable('user_role_assignments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'app_users(id)', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'RESTRICT' },
    condominium_id: {
      type: 'uuid',
      notNull: true,
      references: 'condominiums(id)',
      onDelete: 'RESTRICT'
    },
    scope_type: {
      type: 'text',
      notNull: true,
      check: "scope_type IN ('condominium','tower','unit')"
    },
    tower_id: { type: 'uuid', references: 'towers(id)', onDelete: 'RESTRICT' },
    unit_id: { type: 'uuid', references: 'units(id)', onDelete: 'RESTRICT' },
    is_primary: { type: 'boolean', notNull: true, default: false },
    starts_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    ends_at: { type: 'timestamptz' },
    assigned_by: { type: 'uuid', references: 'app_users(id)', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('user_role_assignments', 'ck_assignment_scope_fields', {
    check: `(scope_type = 'condominium' AND tower_id IS NULL AND unit_id IS NULL)
         OR (scope_type = 'tower' AND tower_id IS NOT NULL AND unit_id IS NULL)
         OR (scope_type = 'unit' AND unit_id IS NOT NULL)`
  });

  pgm.addConstraint('user_role_assignments', 'ck_assignment_dates', {
    check: `ends_at IS NULL OR ends_at > starts_at`
  });

  pgm.createIndex('user_role_assignments', ['user_id', 'ends_at'], { name: 'idx_ura_user_active' });
  pgm.createIndex(
    'user_role_assignments',
    ['condominium_id', 'scope_type', 'tower_id', 'ends_at'],
    { name: 'idx_ura_scope' }
  );

  pgm.sql(`CREATE UNIQUE INDEX uq_active_primary_assignment_per_tower
           ON user_role_assignments (tower_id)
           WHERE scope_type = 'tower' AND is_primary = true AND ends_at IS NULL;`);
};

export const down = (pgm) => {
  pgm.dropTable('user_role_assignments');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
};