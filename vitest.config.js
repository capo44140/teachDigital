import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Mesurer uniquement le code applicatif front (pas backend/, scripts/, dist/...)
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/coverage/**',
        '**/public/**',
        '**/scripts/**'
      ]
      // Pas de seuils de couverture pour l'instant : l'ancienne clé `thresholds.global`
      // (syntaxe Jest) était ignorée par Vitest, et la couverture réelle de src/ est
      // très faible (quelques services seulement). Réintroduire des seuils réalistes
      // au niveau racine quand la couverture aura progressé, par ex. :
      // thresholds: { lines: 20, functions: 20, branches: 20, statements: 20 }
    },
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'coverage/',
      'tests/e2e/**'
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@stores': resolve(__dirname, './src/stores'),
      '@config': resolve(__dirname, './src/config')
    }
  }
})
