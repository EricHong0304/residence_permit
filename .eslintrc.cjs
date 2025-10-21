/* Unified ESLint config for server (TS) and frontends (Vue 3) */
module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    jest: true,
    browser: true,
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'data'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'vue', 'prettier'],
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        'vue/multi-word-component-names': 'off',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
  ],
  rules: {
    'prettier/prettier': 'warn',
  },
};
