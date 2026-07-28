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
  }
];