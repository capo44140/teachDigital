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
      include: [
        "@neondatabase/serverless", 
        "vue",
        "vue-router",
        "pinia",
        "@iconify/vue"
      ],
      exclude: ["vite-plugin-pwa", "@vladmandic/face-api"],
      force: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: false, // Désactiver la minification/compression
      chunkSizeWarningLimit: 1000,
      // Optimisations pour les performances mobiles
      target: ['es2020', 'chrome80', 'firefox78', 'safari14', 'edge80'],
      cssCodeSplit: true,
      reportCompressedSize: false,
      // Optimiser les assets
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Chunking intelligent basé sur les dépendances et l'usage
            
            // Dépendances Vue.js (critiques, chargées en premier)
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('@vue')) {
                return 'vue-core'
              }
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }
              
              // Reconnaissance faciale (lourd, chargé à la demande)
              if (id.includes('@vladmandic/face-api') || id.includes('face-api')) {
                return 'face-recognition'
              }
              
              // Base de données
              if (id.includes('@neondatabase')) {
                return 'database'
              }
              
              // UI et icônes
              if (id.includes('@iconify') || id.includes('tailwindcss')) {
                return 'ui-vendor'
              }
              
              // Autres dépendances
              return 'vendor'
            }
            
            // Chunking des composants basé sur les chunks définis dans le router
            if (id.includes('src/components/')) {
              if (id.includes('FaceRecognition') || id.includes('FaceAuth') || id.includes('FaceRegister')) {
                return 'face-recognition'
              }
              if (id.includes('YouTube') || id.includes('youtube')) {
                return 'youtube-components'
              }
              if (id.includes('LessonScanner') || id.includes('QuizGenerator') || id.includes('TextQuizGenerator')) {
                return 'ai-components'
              }
              if (id.includes('Security') || id.includes('security')) {
                return 'security-components'
              }
              if (id.includes('Progress') || id.includes('Activity') || id.includes('Parent')) {
                return 'tracking-components'
              }
              if (id.includes('Profile') || id.includes('profile')) {
                return 'profile-management'
              }
              if (id.includes('Api') || id.includes('api')) {
                return 'api-components'
              }
              if (id.includes('Test') || id.includes('test')) {
                return 'dev-components'
              }
              if (id.includes('Settings') || id.includes('settings')) {
                return 'settings-components'
              }
            }
            
            // Services spécialisés
            if (id.includes('src/services/')) {
              if (id.includes('face') || id.includes('Face')) {
                return 'face-recognition'
              }
              if (id.includes('youtube') || id.includes('YouTube')) {
                return 'youtube-components'
              }
              if (id.includes('lesson') || id.includes('quiz') || id.includes('ai')) {
                return 'ai-components'
              }
              if (id.includes('security') || id.includes('audit') || id.includes('encryption')) {
                return 'security-components'
              }
              if (id.includes('cache') || id.includes('image')) {
                return 'utility-services'
              }
            }
          },
          // Configuration optimisée pour les noms de fichiers
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId) {
              // Noms plus lisibles pour les chunks de composants
              if (facadeModuleId.includes('src/components/')) {
                const componentName = facadeModuleId.split('/').pop().replace('.vue', '')
                return `assets/components/${componentName}-[hash].js`
              }
              if (facadeModuleId.includes('src/services/')) {
                const serviceName = facadeModuleId.split('/').pop().replace('.js', '')
                return `assets/services/${serviceName}-[hash].js`
              }
            }
            return 'assets/chunks/[name]-[hash].js'
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`
            }
            return `assets/[name]-[hash].${ext}`
          }
        }
      }
    },
    server: {
      port: 3000,
      open: true,
      hmr: {
        overlay: true
      },
      fs: {
        strict: false
      }
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