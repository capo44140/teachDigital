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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
