import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      js,
    },
    rules: {},
    extends: ['plugin:js/recommended', prettier],
  },
])
