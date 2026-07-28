// connect-pg-simple session table
export const up = (pgm) => {
  pgm.createTable('session', {
    sid: { type: 'varchar', notNull: true, primaryKey: true },
    sess: { type: 'json', notNull: true },
    expire: { type: 'timestamp(6)', notNull: true }
  });
  pgm.createIndex('session', 'expire', { name: 'idx_session_expire' });
};

export const down = (pgm) => {
  pgm.dropTable('session');
};