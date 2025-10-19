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
      exclude: ["vite-plugin-pwa"],
      force: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser', // Revenir à terser avec des options plus conservatrices
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        compress: {
          drop_console: false, // Garder les console.log pour le debug
          drop_debugger: false,
          pure_funcs: [], // Ne pas supprimer les fonctions
          // Désactiver les optimisations agressives
          passes: 1,
          unsafe: false,
          unsafe_comps: false,
          unsafe_math: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          unsafe_undefined: false,
          // Préserver l'ordre des modules
          keep_fargs: true,
          keep_fnames: true,
          // Éviter les problèmes d'initialisation
          hoist_funs: false,
          hoist_vars: false,
          reduce_vars: false
        },
        mangle: false, // Désactiver le mangle pour éviter les problèmes de noms
        format: {
          comments: true, // Garder les commentaires
          ascii_only: false
        }
      },
      // Optimisations pour les performances mobiles
      target: ['es2020', 'chrome80', 'firefox78', 'safari14', 'edge80'],
      cssCodeSplit: true,
      reportCompressedSize: false,
      // Optimiser les assets
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Stratégie ultra-simplifiée : tout regrouper par type de dépendance
            
            if (id.includes('node_modules')) {
              // Vue.js et son écosystème
              if (id.includes('vue') || id.includes('@vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              
              // Base de données
              if (id.includes('@neondatabase')) {
                return 'database'
              }
              
              // Toutes les autres dépendances
              return 'vendor'
            }
            
            // Regrouper TOUS les composants et services dans un seul chunk
            // Cela évite les problèmes d'ordre d'initialisation entre chunks
            if (id.includes('src/')) {
              return 'app'
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