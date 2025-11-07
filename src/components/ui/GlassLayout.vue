<template>
  <div class="lg-glass-layout">
    <!-- Arrière-plan animé -->
    <div class="lg-animated-bg lg-z-bg"></div>
    
    <!-- Blobs animés -->
    <div class="lg-blob-container lg-z-blobs">
      <div class="lg-blob lg-blob-1"></div>
      <div class="lg-blob lg-blob-2"></div>
      <div class="lg-blob lg-blob-3"></div>
    </div>
    
    <!-- Contenu principal -->
    <div class="lg-z-content relative">
      <slot />
    </div>
  </div>
</template>

<script setup>
// Composant de layout principal avec arrière-plan Liquid Glass
</script>

<style scoped>
.lg-glass-layout {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}
</style>
