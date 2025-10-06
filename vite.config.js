import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
        manifest: {
          name: "TeachDigital",
          short_name: "TeachDigital",
          description: "Application d'apprentissage numérique pour enfants et adolescents",
          theme_color: "#6366f1",
          background_color: "#ffffff",
          icons: [
            {
              src: "icons/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      include: ["@neondatabase/serverless", "bcryptjs"],
      exclude: ["vite-plugin-pwa"]
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Chunk pour les dépendances externes uniquement
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              if (id.includes('@neondatabase') || id.includes('bcryptjs')) {
                return 'database-vendor'
              }
              return 'vendor'
            }
            
            // Ne pas créer de chunks pour les composants pour éviter les problèmes d'initialisation
            // Laisser Vite gérer automatiquement le code splitting
          },
          // Configuration pour des noms de fichiers plus prévisibles
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    server: {
      port: 3000,
      open: true
    },
    define: {
      // Exposer les variables d'environnement pour le navigateur
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL),
      'process.env.VITE_DATABASE_URL': JSON.stringify(env.VITE_DATABASE_URL),
      'process.env.NEON_HOST': JSON.stringify(env.NEON_HOST),
      'process.env.NEON_DATABASE': JSON.stringify(env.NEON_DATABASE),
      'process.env.NEON_USERNAME': JSON.stringify(env.NEON_USERNAME),
      'process.env.NEON_PASSWORD': JSON.stringify(env.NEON_PASSWORD),
      'process.env.NEON_PORT': JSON.stringify(env.NEON_PORT)
    }
  };
});