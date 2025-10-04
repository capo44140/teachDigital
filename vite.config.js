import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
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
  server: {
    port: 3000,
    open: true
  },
  define: {
    // Exposer les variables d'environnement pour le navigateur
    'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL),
    'process.env.VITE_DATABASE_URL': JSON.stringify(process.env.VITE_DATABASE_URL),
    'process.env.NEON_HOST': JSON.stringify(process.env.NEON_HOST),
    'process.env.NEON_DATABASE': JSON.stringify(process.env.NEON_DATABASE),
    'process.env.NEON_USERNAME': JSON.stringify(process.env.NEON_USERNAME),
    'process.env.NEON_PASSWORD': JSON.stringify(process.env.NEON_PASSWORD),
    'process.env.NEON_PORT': JSON.stringify(process.env.NEON_PORT)
  }
})
