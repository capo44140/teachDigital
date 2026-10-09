import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Version de build : injectée dans le bundle (__APP_VERSION__) ET écrite dans dist/version.json.
// L'application compare la version qu'elle exécute à celle du serveur pour proposer la mise à jour.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const buildTimestamp = Date.now();
const APP_VERSION = `${pkg.version}-${buildTimestamp}`;

/**
 * Écrit dist/version.json avec la même version que celle injectée dans le bundle.
 * (remplace la copie de public/version.json, qui ne sert qu'en développement)
 * scripts/generate-sw.js relit ce fichier pour versionner le Service Worker.
 */
function versionJsonPlugin () {
  let outDir = resolve(process.cwd(), "dist");
  return {
    name: "teachdigital-version-json",
    apply: "build",
    configResolved (config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle () {
      mkdirSync(outDir, { recursive: true });
      const versionInfo = {
        version: pkg.version,
        build: APP_VERSION,
        buildDate: new Date(buildTimestamp).toISOString(),
        buildNumber: buildTimestamp
      };
      writeFileSync(resolve(outDir, "version.json"), JSON.stringify(versionInfo, null, 2) + "\n");
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Un seul Service Worker : public/sw.js, versionné par scripts/generate-sw.js
    // (enregistré manuellement dans src/main.js). Le manifest est public/manifest.json.
    // vite-plugin-pwa n'est plus utilisé : il générait un second sw.js (Workbox) concurrent.
    plugins: [
      vue(),
      versionJsonPlugin()
    ],
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "pinia"
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
          // En dev local, on cible le backend local par défaut.
          // Override possible via VITE_DEV_API_TARGET (ex: https://teach-digital.lespoires.ovh:3002)
          target: env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path // Garder le chemin /api tel quel
        }
      }
    },
    define: {
      // Exposer uniquement les variables d'environnement nécessaires au frontend
      // ATTENTION: Les variables de base de données ne doivent JAMAIS être exposées au frontend
      // Elles sont gérées uniquement par le backend pour des raisons de sécurité
      // Seules les variables préfixées par VITE_ sont accessibles au frontend
      __APP_VERSION__: JSON.stringify(APP_VERSION)
    }
  };
});