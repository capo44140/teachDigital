import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

// Globals partagés : code navigateur (src/) + quelques globals Node encore
// référencés par le code front (process.env, Buffer...).
const sharedGlobals = {
  ...globals.browser,
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  global: 'readonly'
}

const sharedRules = {
  // Allow console in development, warn in production
  'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  'no-unused-vars': 'warn',
  'no-undef': 'error',
  // Les commentaires /* global X */ hérités de l'ancienne config (liste manuelle
  // de globals) ne doivent pas casser le lint maintenant que globals.browser est chargé.
  'no-redeclare': ['error', { builtinGlobals: false }]
}

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'playwright-report/**', 'test-results/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: sharedGlobals
    },
    plugins: {
      vue
    },
    rules: {
      ...vue.configs['vue3-recommended'].rules,
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      ...sharedRules
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: sharedGlobals
    },
    rules: sharedRules
  }
]
