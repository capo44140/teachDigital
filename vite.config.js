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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: true,
          pure_funcs: ['console.log']
        },
        mangle: {
          keep_fnames: true
        }
      },
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Chunk pour Vue et ses dépendances
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            // Chunk pour la base de données
            'database-vendor': ['@neondatabase/serverless', 'bcryptjs'],
            // Chunk pour les services
            'services': [
              './src/services/activityService.js',
              './src/services/aiService.js',
              './src/services/auditLogService.js',
              './src/services/encryptionService.js',
              './src/services/hashService.js',
              './src/services/imageValidationService.js',
              './src/services/lessonService.js',
              './src/services/notificationService.js',
              './src/services/profileService.js',
              './src/services/rateLimitService.js',
              './src/services/sessionService.js'
            ],
            // Chunk pour les composants admin
            'admin-components': [
              './src/components/Dashboard.vue',
              './src/components/ProfileManagement.vue',
              './src/components/SecurityDashboard.vue',
              './src/components/ParentQuizManagement.vue',
              './src/components/ParentProgressTracking.vue',
              './src/components/ParentActivityManagement.vue',
              './src/components/ParentSettings.vue',
              './src/components/LessonScanner.vue',
              './src/components/TextQuizGenerator.vue'
            ],
            // Chunk pour les composants utilisateur
            'user-components': [
              './src/components/UserDashboard.vue',
              './src/components/ProgressTracking.vue',
              './src/components/QuizGenerator.vue'
            ],
            // Chunk pour les composants communs
            'common-components': [
              './src/components/ProfileSelector.vue',
              './src/components/PinLock.vue',
              './src/components/PinSettings.vue',
              './src/components/EditProfilePage.vue',
              './src/components/ProfileSettings.vue',
              './src/components/ImageUpload.vue',
              './src/components/VersionInfo.vue',
              './src/components/NotificationCenter.vue'
            ],
            // Chunk pour les composants de test (en développement uniquement)
            'test-components': [
              './src/components/ProfileTest.vue',
              './src/components/SecurityTest.vue',
              './src/components/NotificationTest.vue',
              './src/components/PinSecurityTest.vue'
            ]
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