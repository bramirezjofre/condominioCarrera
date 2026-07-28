export const up = (pgm) => {
  pgm.createTable('tower_team_members', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    condominium_id: {
      type: 'uuid',
      notNull: true,
      references: 'condominiums(id)',
      onDelete: 'RESTRICT'
    },
    tower_id: { type: 'uuid', notNull: true, references: 'towers(id)', onDelete: 'RESTRICT' },
    person_id: { type: 'uuid', notNull: true, references: 'people(id)', onDelete: 'RESTRICT' },
    user_id: { type: 'uuid', references: 'app_users(id)', onDelete: 'SET NULL' },
    position_title: { type: 'text', notNull: true },
    starts_on: { type: 'date', notNull: true, default: pgm.func('current_date') },
    ends_on: { type: 'date' },
    notes: { type: 'text' },
    created_by: { type: 'uuid', references: 'app_users(id)', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('tower_team_members', 'ck_tower_team_dates', {
    check: `ends_on IS NULL OR ends_on >= starts_on`
  });

  pgm.sql(`CREATE UNIQUE INDEX uq_active_person_per_tower_team
           ON tower_team_members (tower_id, person_id)
           WHERE ends_on IS NULL;`);

  pgm.sql(`CREATE TRIGGER trg_tower_team_members_updated_at
           BEFORE UPDATE ON tower_team_members
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

export const down = (pgm) => {
  pgm.dropTable('tower_team_members');
};