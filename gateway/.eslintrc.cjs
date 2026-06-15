/** @see ../backend/.eslintrc.cjs */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
  rules: {
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
  },
  ignorePatterns: ['node_modules/', 'sessions/'],
  overrides: [
    {
      files: ['src/waCalls.js'],
      env: { node: true, browser: true },
    },
  ],
};
