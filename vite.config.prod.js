import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Configuration spécifique pour la production
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000, // Augmenter la limite à 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Chunk pour les dépendances externes
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            if (id.includes('@neondatabase') || id.includes('bcryptjs')) {
              return 'database-vendor'
            }
            return 'vendor'
          }
          
          // Chunk pour les services
          if (id.includes('/src/services/')) {
            return 'services'
          }
          
          // Chunk pour les composants admin
          if (id.includes('/src/components/') && (
            id.includes('Dashboard.vue') ||
            id.includes('ProfileManagement.vue') ||
            id.includes('SecurityDashboard.vue') ||
            id.includes('ParentQuizManagement.vue') ||
            id.includes('ParentProgressTracking.vue') ||
            id.includes('ParentActivityManagement.vue') ||
            id.includes('ParentSettings.vue') ||
            id.includes('LessonScanner.vue') ||
            id.includes('TextQuizGenerator.vue')
          )) {
            return 'admin-components'
          }
          
          // Chunk pour les composants utilisateur
          if (id.includes('/src/components/') && (
            id.includes('UserDashboard.vue') ||
            id.includes('ProgressTracking.vue') ||
            id.includes('QuizGenerator.vue')
          )) {
            return 'user-components'
          }
          
          // Chunk pour les composants communs
          if (id.includes('/src/components/')) {
            return 'common-components'
          }
          
          // Chunk pour les stores et configuration
          if (id.includes('/src/stores/') || id.includes('/src/config/')) {
            return 'app-core'
          }
        },
        // Configuration pour des noms de fichiers plus prévisibles
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
