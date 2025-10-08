import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueConfig from '@vue/eslint-config-standard'

export default [
  js.configs.recommended,
  ...vueConfig,
  {
    files: ['**/*.vue', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      vue,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },
]
