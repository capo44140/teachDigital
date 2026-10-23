<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <section
      class="relative z-10 glass-card-dashboard max-w-lg text-center items-center py-12"
      aria-labelledby="not-found-title"
    >
      <p class="text-6xl font-bold text-white/80" aria-hidden="true">404</p>
      <h1 id="not-found-title" class="text-3xl font-bold text-white">Page introuvable</h1>
      <p class="text-white/70">
        Cette adresse ne correspond à aucune page de TeachDigital.
        Le lien est peut-être ancien ou mal recopié.
      </p>
      <router-link
        to="/"
        class="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/40 transition-all"
      >
        Retour à l'accueil
      </router-link>
    </section>
  </div>
</template>

<script setup>
// Page 404 : volontairement publique et sans aucun appel API
</script>
