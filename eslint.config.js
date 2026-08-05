import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'migrations/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off'
    }
  },
  {
    files: ['src/public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: { document: 'readonly', window: 'readonly', fetch: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', confirm: 'readonly' }
    }
  },
  {
    files: ['src/public/service-worker.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: { self: 'readonly', caches: 'readonly', clients: 'readonly', fetch: 'readonly', Request: 'readonly', Response: 'readonly' }
    }
  }
];