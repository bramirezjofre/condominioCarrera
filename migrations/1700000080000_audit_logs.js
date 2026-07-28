export const up = (pgm) => {
  pgm.createTable('audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    condominium_id: { type: 'uuid', references: 'condominiums(id)', onDelete: 'SET NULL' },
    actor_user_id: { type: 'uuid', references: 'app_users(id)', onDelete: 'SET NULL' },
    action: { type: 'text', notNull: true },
    entity_type: { type: 'text' },
    entity_id: { type: 'uuid' },
    request_id: { type: 'text' },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    success: { type: 'boolean', notNull: true, default: true },
    before_data: { type: 'jsonb' },
    after_data: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('audit_logs', ['condominium_id', 'entity_type', 'entity_id', 'created_at'], {
    name: 'idx_audit_entity'
  });
};

export const down = (pgm) => {
  pgm.dropTable('audit_logs');
};