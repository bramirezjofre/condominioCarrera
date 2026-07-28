export const up = (pgm) => {
  pgm.sql(`CREATE UNIQUE INDEX uq_app_users_email_active
           ON app_users (lower(email))
           WHERE deleted_at IS NULL;`);

  pgm.sql(`CREATE UNIQUE INDEX uq_app_users_username_active
           ON app_users (lower(username))
           WHERE deleted_at IS NULL;`);
};

export const down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS uq_app_users_email_active;');
  pgm.sql('DROP INDEX IF EXISTS uq_app_users_username_active;');
};