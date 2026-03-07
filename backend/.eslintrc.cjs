/**
 * ESLint configuration — Global coding standards
 * @see https://eslint.org/docs/latest/use/configure/
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
  },
  overrides: [
    {
      files: ['public/**/*.js'],
      env: { browser: true },
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['tests/**/*.js'],
      env: { mocha: true, jest: true },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'uploads/',
    'logs/',
    '*.min.js',
  ],
};
