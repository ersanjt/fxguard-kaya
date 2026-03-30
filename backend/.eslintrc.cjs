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
    'no-empty': ['error', { allowEmptyCatch: true }],
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
    // Legacy browser bundles — IIFE و globals؛ استاندارد در FRONTEND-ARCHITECTURE.md
    'public/js/dashboard.js',
    'public/js/i18n-fa.js',
    'public/js/i18n-en.js',
    'public/js/i18n-tr.js',
    'public/js/landing.js',
    // قطعه‌های خروجی bundle-dashboard — به‌تنهایی برای پارسر JS معتبر نیستند
    'public/js/dashboard/src/**',
    // globals مرورگر (t، LANG)؛ با dashboard یکپارچه لود می‌شود
    'public/js/modules/dashboard-i18n.js',
  ],
};
