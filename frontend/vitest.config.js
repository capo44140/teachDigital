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
      ],
      // Seuils = couverture mesurée (arrondie à l'entier inférieur) : elle ne peut pas régresser.
      // À relever quand des tests sont ajoutés (vitest run --coverage).
      thresholds: {
        statements: 70,
        branches: 72,
        functions: 39,
        lines: 70
      }
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
