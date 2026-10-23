<template>
  <!-- Fond animé partagé : rendu une seule fois par App.vue, derrière toutes les pages -->
  <div class="app-background" :data-tone="tone" aria-hidden="true">
    <div class="app-background__blob app-background__blob--1"></div>
    <div class="app-background__blob app-background__blob--2"></div>
    <div class="app-background__blob app-background__blob--3"></div>
  </div>
</template>

<script setup>
defineProps({
  // purple (défaut) | blue | green | red | orange | yellow | rainbow
  tone: {
    type: String,
    default: 'purple'
  }
})
</script>

<style scoped>
/*
 * Coût GPU maîtrisé : trois disques flous animés (blur 64px + mix-blend-multiply) sur grand écran
 * uniquement. Sur petit écran, avec « réduire les animations » ou « réduire la transparence »,
 * les disques deviennent des dégradés radiaux statiques (aucun filtre, aucune animation).
 */
.app-background {
  --bg-edge: #0f172a; /* slate-900 */
  --bg-via: #581c87; /* purple-900 */
  --blob-1: #a855f7; /* purple-500 */
  --blob-2: #3b82f6; /* blue-500 */
  --blob-3: #ec4899; /* pink-500 */

  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background-color: var(--bg-edge);
  background-image: linear-gradient(to bottom right, var(--bg-edge), var(--bg-via), var(--bg-edge));
}

.app-background[data-tone="blue"] {
  --bg-via: #1e3a8a;
  --blob-1: #3b82f6;
  --blob-2: #06b6d4;
  --blob-3: #6366f1;
}

.app-background[data-tone="green"] {
  --bg-via: #14532d;
  --blob-1: #22c55e;
  --blob-2: #3b82f6;
  --blob-3: #10b981;
}

.app-background[data-tone="red"] {
  --bg-via: #7f1d1d;
  --blob-1: #ef4444;
  --blob-2: #f97316;
  --blob-3: #ec4899;
}

.app-background[data-tone="orange"] {
  --bg-via: #7c2d12;
  --blob-1: #f97316;
  --blob-2: #ef4444;
  --blob-3: #eab308;
}

.app-background[data-tone="yellow"] {
  --bg-via: #713f12;
  --blob-1: #eab308;
  --blob-2: #f97316;
  --blob-3: #f59e0b;
}

.app-background[data-tone="rainbow"] {
  --bg-via: #581c87;
  --blob-1: #f87171;
  --blob-2: #60a5fa;
  --blob-3: #c084fc;
}

.app-background__blob {
  position: absolute;
  width: 20rem;
  height: 20rem;
  border-radius: 9999px;
  opacity: 0.2;
  mix-blend-mode: multiply;
  filter: blur(64px);
  animation: lg-blob-animation 7s infinite ease-in-out;
}

.app-background__blob--1 {
  top: -10rem;
  right: -10rem;
  background-color: var(--blob-1);
}

.app-background__blob--2 {
  bottom: -10rem;
  left: -10rem;
  background-color: var(--blob-2);
  animation-delay: 2s;
}

.app-background__blob--3 {
  top: 50%;
  left: 50%;
  background-color: var(--blob-3);
  animation-delay: 4s;
}

/* Version statique, sans filtre ni animation */
@media (max-width: 640px), (prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce) {
  .app-background__blob {
    animation: none;
    filter: none;
    mix-blend-mode: normal;
    opacity: 0.18;
  }

  .app-background__blob--1 {
    background: radial-gradient(circle, var(--blob-1) 0%, transparent 70%);
  }

  .app-background__blob--2 {
    background: radial-gradient(circle, var(--blob-2) 0%, transparent 70%);
  }

  .app-background__blob--3 {
    background: radial-gradient(circle, var(--blob-3) 0%, transparent 70%);
  }
}
</style>
