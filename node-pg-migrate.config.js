// node-pg-migrate config
export default {
  databaseUrl: { env: 'DATABASE_URL' },
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up',
  count: Infinity,
  ignorePattern: '\\..*',
  schema: 'public',
  createSchema: false,
  createMigrationsSchema: false,
  decamelize: false,
  noLock: false,
  singleTransaction: true,
  checkOrder: true,
  verbose: true
};