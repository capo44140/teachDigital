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
        "vue",
        "vue-router",
        "pinia"
      ],
      exclude: [
        "vite-plugin-pwa"
      ],
      esbuildOptions: {
        target: 'es2020',
        treeShaking: true // ✅ Tree-shaking activé
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        compress: {
          // ✅ Optimisations de production activées
          drop_console: true, // Supprimer console.log en production
          drop_debugger: true, // Supprimer debugger en production
          pure_funcs: ['console.log', 'console.info', 'console.debug'], // Fonctions à supprimer
          // ✅ Optimisations sécurisées
          passes: 2, // 2 passes d'optimisation
          unsafe: false, // Rester safe
          unsafe_comps: false,
          unsafe_math: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          unsafe_undefined: false,
          // ✅ Tree-shaking amélioré
          dead_code: true, // Supprimer code mort
          unused: true, // Supprimer variables inutilisées
          // ✅ Optimisations de taille
          collapse_vars: true,
          reduce_vars: true,
          booleans: true,
          if_return: true,
          sequences: true,
          join_vars: true,
          // ⚠️ Conserver ce qui est nécessaire pour Vue
          keep_fargs: false, // Optimiser les arguments
          keep_fnames: false, // Optimiser les noms (sauf composants Vue)
          keep_classnames: true, // ✅ Important pour Vue.js
        },
        mangle: {
          // ✅ Minifier les noms mais préserver ce qui est important
          toplevel: false,
          keep_classnames: true, // ✅ Critique pour Vue.js
          keep_fnames: false,
          safari10: true // Compatibilité Safari
        },
        format: {
          comments: false, // Supprimer les commentaires en production
          ascii_only: false,
          ecma: 2020
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
              if (id.includes('postgres') || id.includes('@neondatabase')) {
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
      },
      // Proxy pour contourner CORS en développement
      proxy: {
        '/api': {
          target: 'https://teach-digital.lespoires.ovh:3002',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path // Garder le chemin /api tel quel
        }
      }
    },
    define: {
      // Exposer uniquement les variables d'environnement nécessaires au frontend
      // ATTENTION: Les variables de base de données ne doivent JAMAIS être exposées au frontend
      // Elles sont gérées uniquement par le backend pour des raisons de sécurité
      // Seules les variables préfixées par VITE_ sont accessibles au frontend
    }
  };
});